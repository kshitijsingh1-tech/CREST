from __future__ import annotations

import argparse
import json

from ai.rag.knowledge_base import ingest_rag_dataset
from backend.utils.init_db import initialize_database


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract, embed, and ingest PDFs from the local rag dataset."
    )
    parser.add_argument(
        "--dataset-dir",
        default=None,
        help="Optional dataset directory. Defaults to CREST_RAG_DATASET_DIR or ragdataset.",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=None,
        help="Chunk size in characters.",
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=None,
        help="Chunk overlap in characters.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Extract, chunk, and embed without writing to the database.",
    )
    parser.add_argument(
        "--purge-existing",
        action="store_true",
        help="Delete existing rag document chunks before inserting the new dataset.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    try:
        if not args.dry_run:
            initialize_database()

        ingest_kwargs = {
            "dataset_dir": args.dataset_dir,
            "persist": not args.dry_run,
            "purge_existing": args.purge_existing,
        }
        if args.chunk_size is not None:
            ingest_kwargs["chunk_size"] = args.chunk_size
        if args.chunk_overlap is not None:
            ingest_kwargs["chunk_overlap"] = args.chunk_overlap

        summary = ingest_rag_dataset(**ingest_kwargs)
        
        # Clean up documents from the summary to avoid huge output
        if "documents" in summary:
            docs = summary.pop("documents")
            print(f"Ingested {len(docs)} documents.")
            
        print(json.dumps(summary, indent=2))
        
    except Exception as e:
        print(f"\nFATAL ERROR during ingestion: {e}")
        import traceback
        traceback.print_exc()
        exit(1)


if __name__ == "__main__":
    main()
