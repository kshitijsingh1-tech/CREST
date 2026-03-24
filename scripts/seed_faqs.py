import os
import sys

# Ensure d:\crest is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv()

from backend.utils.db import SessionLocal
from backend.models.knowledge import ResolutionKnowledge
from ai.embeddings.embedder import embed

faqs = [
    {
        "category": "General",
        "sub_category": "App Info",
        "q": "What is Union ease?",
        "a": "Union ease is a Mobile Banking application launched by Union Bank of India, offering innovative features that integrates Banking, Lifestyle & Investment into a single mobile application. You can view account related information, transfer funds, pay bills, recharge your mobile and a lot more using this application."
    },
    {
        "category": "General",
        "sub_category": "App Info",
        "q": "What are the minimum device requirements?",
        "a": "The app is supported on devices with the following operating systems:\n- Android: Version 11 or higher\n- IOS: Version 17 or higher"
    },
    {
        "category": "General",
        "sub_category": "App Info",
        "q": "How can I download the Union ease app?",
        "a": "You can download the Union ease from the Google Play Store for Android devices or App Store for ios devices."
    },
    {
        "category": "General",
        "sub_category": "App Info",
        "q": "Who can use Union ease?",
        "a": "Both existing Union Bank of India customers and new users can use Union ease. New users can open a digital savings account through Union ease."
    },
    {
        "category": "General",
        "sub_category": "App Info",
        "q": "What are the basic requirements for registering on the Union ease?",
        "a": "You need to have a Smartphone, Active mobile data and an active Debit Card or Branch generated token."
    },
    {
        "category": "General",
        "sub_category": "App Info",
        "q": "Who are eligible for using Union ease?",
        "a": "Customers of Bank having SB/CD/OD/CC accounts can use Union ease. The account must be KYC compliant. Companies, Trust, HUF and Partnership Firms are not eligible to avail Union ease services."
    },
    {
        "category": "General",
        "sub_category": "App Info",
        "q": "Can I use Union ease on two devices simultaneously?",
        "a": "No, to ensure the security of your account you can only use the application on one handset at a time."
    },
    {
        "category": "General",
        "sub_category": "App Info",
        "q": "How many accounts can be linked to Union ease?",
        "a": "Customer will be able to view all the eligible accounts linked to the customer id."
    },
    {
        "category": "NetBanking",
        "sub_category": "PIN Reset",
        "q": "I have forgotten my Login PIN. What do I do?",
        "a": "You can reset your Login PIN by clicking on Forgot Login PIN on Pre-Login page or by visiting My profile section post login."
    },
    {
        "category": "NetBanking",
        "sub_category": "PIN Reset",
        "q": "What are the options to Reset Login Pin in Union ease?",
        "a": "Users can perform the multi-factor authentication (MFA) and reset Login PIN using Debit card or Branch generated token."
    },
    {
        "category": "NetBanking",
        "sub_category": "PIN Reset",
        "q": "I have forgotten my Transaction PIN. What do I do?",
        "a": "You can reset your Transaction PIN by visiting My profile section post login."
    },
    {
        "category": "NetBanking",
        "sub_category": "Balance Enquiry",
        "q": "How can I do a balance enquiry using Union ease?",
        "a": "All you need to do is Go to Accounts section and click on the account. Alternatively, you can select any of your operative account as Primary Account and do balance enquiry on the pre-login page itself by authorizing using Login PIN."
    },
    {
        "category": "NEFT_RTGS",
        "sub_category": "Funds Transfer",
        "q": "How can I transfer money to a third party using Union ease?",
        "a": "For transferring money, you can navigate to 'Send Money'. Fund Transfer can be made either by adding the third party as Beneficiary or Fund transfer without adding third party as beneficiary and using Quick fund Transfer with a cap of maximum Rs. 50000 per day."
    },
    {
        "category": "NEFT_RTGS",
        "sub_category": "Funds Transfer",
        "q": "How do I add a third party as beneficiary?",
        "a": "For adding a third party as beneficiary, you can visit Pay & Transfer and then click on Manage Payee option to add a beneficiary."
    },
    {
        "category": "NEFT_RTGS",
        "sub_category": "Funds Transfer",
        "q": "Is it possible to transfer funds instantly after adding a beneficiary?",
        "a": "After adding a beneficiary, the user can view their details under 'Pay & Transfer > Manage Payee.' For your safety, the beneficiary will be active and available for fund transfers after the cooling period of 3 hours."
    },
    {
        "category": "NEFT_RTGS",
        "sub_category": "Funds Transfer",
        "q": "I do not want to add third party as beneficiary. Can I still make fund transfer?",
        "a": "Fund transfer without adding third party as beneficiary can be done using Quick fund Transfer with a cap of maximum Rs 50000 per day at present."
    },
    {
        "category": "NEFT_RTGS",
        "sub_category": "Funds Transfer",
        "q": "What is the maximum amount that I can transfer in a day?",
        "a": "You can transfer maximum Rs. 10,00,000/- using Union ease in a day. The various limits can also be viewed by navigating to Transfer Limit under Pay & Transfer in Union ease."
    },
    {
        "category": "NetBanking",
        "sub_category": "Bill Payment",
        "q": "What are the various types of Bill payment that can be made using Union ease?",
        "a": "Bills can be paid for Utilities such as Electricity, Water Tax, Mobile Recharge, DTH payment etc. Further, new utility categories added under BBPS platform also appear under Bill Payment"
    },
    {
        "category": "Card",
        "sub_category": "Debit Card",
        "q": "How can I block my debit card using Union ease?",
        "a": "You can block debit card by navigating to Debit Card under Pay & Transfer and selecting Block/Unblock under Manage Debit card."
    },
    {
        "category": "FD",
        "sub_category": "Fixed Deposit",
        "q": "I am senior citizen and want to invest some money in fixed deposit. Can I do so without visiting branch?",
        "a": "Yes, you can open fixed deposit through Union ease"
    },
    {
        "category": "UPI",
        "sub_category": "UPI ID",
        "q": "Do you have any app for UPI services?",
        "a": "UPI services can be availed on Union ease by creating UPI ID and setting UPI PIN."
    },
    {
        "category": "General",
        "sub_category": "Account Update",
        "q": "Can I update existing Nominee in existing account?",
        "a": "The existing nominee can be updated through Mobile Banking. You will receive an SMS and an e-mail upon updation of the nominee details."
    }
]

def run():
    db = SessionLocal()
    try:
        inserted = 0
        for item in faqs:
            # Check if exists
            exists = db.query(ResolutionKnowledge).filter(ResolutionKnowledge.title == item["q"]).first()
            if exists:
                continue

            vector = embed(item["q"] + " " + item["a"])
            rk = ResolutionKnowledge(
                category=item["category"],
                sub_category=item["sub_category"],
                title=item["q"],
                problem_desc=item["q"],
                resolution_text=item["a"],
                embedding=vector,
                success_count=100,
                avg_csat=4.8
            )
            db.add(rk)
            inserted += 1
        db.commit()
        print(f"Successfully seeded {inserted} Union Bank FAQs into the PGVector Knowledge Base!")
    finally:
        db.close()

if __name__ == "__main__":
    run()
