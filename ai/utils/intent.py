"""
CREST — Inbound Message Intent Classification & Conversational AI Helper
Determines if an incoming message from a messaging channel (Telegram, Discord) is
a complaint/grievance or a general inquiry, greeting, or conversation.
If conversational, it uses the Cresty RAG-grounded system to reply.
"""

from __future__ import annotations

import os
from backend.utils.logger import get_logger

logger = get_logger("crest.ai.intent")


def classify_message_intent(text: str) -> str:
    """
    Classifies the user message as 'COMPLAINT' or 'CONVERSATION'.
    Uses simple local heuristics first (for performance), then falls back to Groq.
    """
    cleaned = text.strip().lower()
    if not cleaned:
        return "CONVERSATION"

    # Common greetings and brief chat keywords (heuristics)
    greetings = {
        "hi", "hello", "hey", "hola", "namaste", "good morning", "good afternoon",
        "good evening", "anyone online", "anyone here", "yo", "hello bot",
        "cresty", "cresty bot", "thanks", "thank you", "bye", "goodbye"
    }
    if cleaned in greetings:
        return "CONVERSATION"

    # Very short messages are likely greetings/inquiries, not complete complaints
    if len(cleaned.split()) <= 2:
        # Check if the words look like account/ATM issue keywords to avoid misclassifying short complaints
        complaint_keywords = {"atm", "failed", "deducted", "stolen", "block", "fraud", "dispute", "scam"}
        words = set(cleaned.split())
        if not (words & complaint_keywords):
            return "CONVERSATION"

    questions = {
        "how are you", "what can you do", "who are you", "help me", "how to use",
        "what is this", "tell me about crest", "what is crest", "who is cresty"
    }
    if cleaned in questions:
        return "CONVERSATION"

    # Use LLM classification for robust results
    try:
        from ai.providers.groq import create_chat_completion, get_model, has_api_key
        if has_api_key():
            model = get_model("GROQ_CLASSIFY_MODEL", "llama-3.3-70b-versatile")
            system_prompt = (
                "You are an AI classifier that determines if a customer message is a new banking complaint/grievance to be logged, "
                "or if it is just a general conversation, inquiry, greeting, or request for information.\n"
                "Respond with EXACTLY one word: either 'COMPLAINT' or 'CONVERSATION'. Do not provide any other text, explanation, or punctuation.\n\n"
                "Examples:\n"
                "- 'My ATM transaction failed and 5000 was debited' -> COMPLAINT\n"
                "- 'Hello, how can I open a fixed deposit account?' -> CONVERSATION\n"
                "- 'I want to complain about loan delay' -> COMPLAINT\n"
                "- 'what are the timings for the Mumbai branch?' -> CONVERSATION\n"
                "- 'Hi' -> CONVERSATION\n"
                "- 'Someone stole my debit card' -> COMPLAINT\n"
            )
            reply = create_chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text}
                ],
                model=model,
                max_tokens=10,
                temperature=0.0
            )
            reply_upper = reply.strip().upper()
            if "COMPLAINT" in reply_upper:
                return "COMPLAINT"
            else:
                return "CONVERSATION"
    except Exception as e:
        logger.error(f"Failed to classify message intent using Groq: {e}")

    # Fallback to COMPLAINT to ensure we don't accidentally ignore a real complaint
    return "COMPLAINT"


def get_cresty_response(user_query: str) -> str:
    """
    Queries Cresty's RAG knowledge base for contextual grounding and returns
    an AI response. Replicates the core logic of `/api/public/chat`.
    """
    from ai.providers.groq import create_chat_completion, get_model, has_api_key
    from ai.rag.retriever import retrieve_resolutions
    from ai.embeddings.embedder import embed
    from ai.rag.knowledge_base import search_document_chunks

    document_excerpts = []
    past_cases = []
    try:
        query_vector = embed(user_query)
        if query_vector:
            document_excerpts = search_document_chunks(
                query=user_query,
                embedding=query_vector,
                top_k=2,
                min_relevance=0.45
            )
            past_cases = retrieve_resolutions(
                embedding=query_vector,
                top_k=2,
                query=user_query
            )
    except Exception as e:
        logger.error(f"RAG lookup failed for query: {e}")

    context_str = ""
    if document_excerpts:
        context_str += "\nBANK POLICY EXCERPTS:\n"
        for chunk in document_excerpts:
            context_str += f"- Policy: {chunk['document_title']} (Page {chunk['page_number']}): {chunk['content']}\n"
    if past_cases:
        context_str += "\nPAST SIMILAR CASES:\n"
        for case in past_cases:
            context_str += f"- Problem: {case['problem_desc']} -> Resolution: {case['resolution_text']}\n"

    system_prompt = (
        "You are 'Cresty', the official Union Bank of India Citizen Support AI Assistant.\n"
        "Your mission is to provide helpful, warm, empathetic, and clear answers to customer inquiries.\n\n"
        "GUIDELINES:\n"
        "- Ground your answers strictly on the provided Bank Policy Excerpts and Past Cases if relevant. If no context is available, use general, professional banking knowledge.\n"
        "- Do not make up false transaction status or specific account balances. If they ask about a ticket status, tell them they can use the tracking gateway on our portal.\n"
        "- If a citizen wants to lodge a complaint, guide them to click 'Lodge New Grievance' on our portal or assist them in summarizing their issue. Since they are chatting via a messaging channel (like Telegram or Discord), you can also tell them that they can just type their complaint details here, and our system will register it as a ticket.\n"
        "- Keep responses concise and easy to read (use bullet points where appropriate).\n"
        "- End with a helpful, positive closing statement.\n"
    )
    if context_str:
        system_prompt += f"\nGROUNDING CONTEXT:\n{context_str}"

    messages_payload = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_query}
    ]

    try:
        if has_api_key():
            model = get_model("GROQ_DRAFT_MODEL", "llama-3.3-70b-versatile")
            reply = create_chat_completion(
                messages=messages_payload,
                model=model,
                max_tokens=600,
                temperature=0.4
            )
        else:
            reply = "Hello! I am Cresty, your Union Bank support assistant. Currently, my generative model is offline, but you can lodge a new complaint or track your status using our portal. Let me know how I can help!"
    except Exception as e:
        logger.error(f"Groq chat completion failed: {e}")
        reply = "I apologize, but I am experiencing some difficulties processing your request right now. You can safely lodge your complaint or track your status using our official portal links!"

    return reply
