#!/usr/bin/env python3
"""
Quick test script to verify Focus AI backend setup
Run this to check if all configurations are correct
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

def test_env_variables():
    print("🔍 Checking environment variables...")

    required_vars = {
        'POE_API_KEY': os.getenv('POE_API_KEY'),
        'SUPABASE_URL': os.getenv('SUPABASE_URL'),
        'SUPABASE_SERVICE_KEY': os.getenv('SUPABASE_SERVICE_KEY'),
    }

    all_present = True
    for var_name, var_value in required_vars.items():
        if not var_value:
            print(f"  ❌ {var_name} is not set")
            all_present = False
        else:
            masked_value = var_value[:10] + '...' if len(var_value) > 10 else var_value
            print(f"  ✅ {var_name} = {masked_value}")

    return all_present

def test_imports():
    print("\n🔍 Checking Python dependencies...")

    packages = [
        'fastapi',
        'fastapi_poe',
        'uvicorn',
        'supabase',
        'dotenv',
    ]

    all_imported = True
    for package in packages:
        try:
            __import__(package.replace('_', '.') if '_' in package else package)
            print(f"  ✅ {package}")
        except ImportError:
            print(f"  ❌ {package} - Run: pip install {package}")
            all_imported = False

    return all_imported

def test_supabase_connection():
    print("\n🔍 Testing Supabase connection...")

    try:
        from supabase import create_client

        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_KEY')

        if not url or not key:
            print("  ❌ Missing Supabase credentials")
            return False

        client = create_client(url, key)

        result = client.table('user_profiles').select('id').limit(1).execute()
        print(f"  ✅ Connected to Supabase successfully")
        return True
    except Exception as e:
        print(f"  ❌ Failed to connect to Supabase: {str(e)}")
        return False

def test_poe_api():
    print("\n🔍 Testing Poe API (without making actual call)...")

    api_key = os.getenv('POE_API_KEY')

    if not api_key:
        print("  ❌ POE_API_KEY not set")
        return False

    if len(api_key) < 20:
        print("  ❌ POE_API_KEY seems too short")
        return False

    print(f"  ✅ POE_API_KEY is set (length: {len(api_key)})")
    print("  ℹ️  Note: Not making actual API call to avoid usage")
    return True

def test_tables_exist():
    print("\n🔍 Checking required Supabase tables...")

    try:
        from supabase import create_client

        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_KEY')

        if not url or not key:
            return False

        client = create_client(url, key)

        tables = [
            'user_profiles',
            'focus_sessions',
            'distractions',
            'momo_conversations',
            'momo_messages',
            'momo_ai_usage',
        ]

        all_exist = True
        for table in tables:
            try:
                client.table(table).select('*').limit(1).execute()
                print(f"  ✅ {table}")
            except Exception as e:
                print(f"  ❌ {table} - {str(e)[:50]}...")
                all_exist = False

        return all_exist
    except Exception as e:
        print(f"  ❌ Failed to check tables: {str(e)}")
        return False

def main():
    print("=" * 60)
    print("  Focus AI Backend Setup Verification")
    print("=" * 60)

    tests = [
        ("Environment Variables", test_env_variables),
        ("Python Dependencies", test_imports),
        ("Supabase Connection", test_supabase_connection),
        ("Supabase Tables", test_tables_exist),
        ("Poe API Configuration", test_poe_api),
    ]

    results = []
    for test_name, test_func in tests:
        try:
            passed = test_func()
            results.append((test_name, passed))
        except Exception as e:
            print(f"\n❌ {test_name} failed with error: {str(e)}")
            results.append((test_name, False))

    print("\n" + "=" * 60)
    print("  Summary")
    print("=" * 60)

    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status} - {test_name}")

    all_passed = all(passed for _, passed in results)

    if all_passed:
        print("\n🎉 All tests passed! You're ready to start the backend:")
        print("   python main.py")
    else:
        print("\n⚠️  Some tests failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == '__main__':
    main()
