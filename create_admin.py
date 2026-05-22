import os
import sys
from dotenv import load_dotenv

# Ensure the root workspace directory is in the Python search path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load production or local credentials from .env
load_dotenv()

from backend.utils.db import SessionLocal
from backend.models.user import User
from backend.utils.auth import get_password_hash

def main():
    print("==================================================")
    print("       CREST - Secure Admin Creation Script       ")
    print("==================================================")
    
    # Check if DB URL is loaded
    db_url = os.getenv("CREST_DB_URL")
    if not db_url:
        print("❌ Error: CREST_DB_URL is not set in your environment or .env file.")
        sys.exit(1)
        
    print(f"🔗 Connected Database target starts with: {db_url[:25]}...")
    
    # 1. Prompt for Email
    email = input("📧 Enter Admin Email: ").strip()
    if not email or "@" not in email:
        print("❌ Error: Invalid email format.")
        sys.exit(1)
        
    # 2. Prompt for Name
    name = input("👤 Enter Admin Full Name: ").strip()
    if not name:
        print("❌ Error: Name cannot be blank.")
        sys.exit(1)
        
    # 3. Prompt for Password
    password = input("🔑 Enter Admin Password (minimum 6 characters): ").strip()
    if not password or len(password) < 6:
        print("❌ Error: Password must be at least 6 characters.")
        sys.exit(1)
        
    # 4. Prompt for Role
    print("\nSelect User Role:")
    print("1. SUPER_ADMIN (Full control, credentials administration)")
    print("2. SUB_ADMIN   (Regional monitoring, complaint allocation)")
    role_choice = input("Enter choice (1 or 2, default is 1): ").strip()
    
    role = "SUPER_ADMIN"
    if role_choice == "2":
        role = "SUB_ADMIN"
        
    # Begin Database Transaction
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"\n⚠️ Notice: A user with email '{email}' already exists (Role: {existing_user.role}).")
            reset_choice = input("Would you like to reset/update this user's password? (y/n, default is n): ").strip().lower()
            if reset_choice == "y":
                hashed = get_password_hash(password)
                existing_user.hashed_password = hashed
                # Also ensure the user's name is updated if requested
                existing_user.name = name
                db.commit()
                print("\n==================================================")
                print("🎉 SUCCESS: Password updated successfully!")
                print("==================================================")
            else:
                print("❌ Aborted: User already exists, no changes made.")
            return
            
        # Hash password and create User record
        hashed = get_password_hash(password)
        new_admin = User(
            email=email,
            name=name,
            hashed_password=hashed,
            role=role
        )
        
        db.add(new_admin)
        db.commit()
        
        print("\n==================================================")
        print("🎉 SUCCESS: Admin account created in database!")
        print("==================================================")
        print(f"👤 Name:  {name}")
        print(f"📧 Email: {email}")
        print(f"🛡️ Role:  {role}")
        print("==================================================")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Database Error: Could not save the admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
