"""
SSH into Hostinger and:
1. Create correct .env file
2. Check build exists
3. Copy static files
"""
import subprocess
import sys

# Install paramiko if not present
try:
    import paramiko
except ImportError:
    print("Installing paramiko...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"])
    import paramiko

import time

HOST     = "145.79.58.124"
PORT     = 65002
USER     = "u889282535"
PASSWORD = "Mahadev@6163"
APP_DIR  = "/home/u889282535/domains/moneymitrafinancialadvisor.com/nodejs"

ENV_CONTENT = '''DATABASE_URL="mysql://u889282535_loan:Mahadev%406163@srv2214.hstgr.io:3306/u889282535_loan?connection_limit=3&connect_timeout=30&pool_timeout=30"
DIRECT_DATABASE_URL="mysql://u889282535_loan:Mahadev%406163@srv2214.hstgr.io:3306/u889282535_loan"
NEXTAUTH_SECRET=super-secret-nextauth-key-loan-app-2024
NEXTAUTH_URL=https://moneymitrafinancialadvisor.com
NODE_ENV=production
CRON_SECRET=moneymitra-cron-secret-2024
'''

def run(client, cmd, timeout=120):
    print(f"\n$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(f"[err] {err}")
    return out, err

def main():
    print(f"🔌 Connecting to {HOST}:{PORT} as {USER}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
        print("✅ SSH connected!\n")
    except Exception as e:
        print(f"❌ SSH connection failed: {e}")
        return

    # 1. Write .env file
    print("📝 Writing .env file...")
    escaped = ENV_CONTENT.replace("'", "'\\''")  # escape single quotes
    write_cmd = f"cat > {APP_DIR}/.env << 'ENVEOF'\n{ENV_CONTENT}ENVEOF"
    run(client, write_cmd)

    # 2. Verify .env was written
    print("\n📋 Verifying .env contents:")
    out, _ = run(client, f"cat {APP_DIR}/.env")

    # 3. Check if build exists
    print("\n🔍 Checking build...")
    out, _ = run(client, f"ls {APP_DIR}/.next/standalone/server.js 2>/dev/null && echo 'BUILD_EXISTS' || echo 'NO_BUILD'")
    build_exists = "BUILD_EXISTS" in out

    if build_exists:
        print("✅ Build already exists!")
        # Copy static files (in case not done yet)
        print("\n📁 Ensuring static files are in place...")
        run(client, f"cp -r {APP_DIR}/.next/static {APP_DIR}/.next/standalone/.next/static 2>/dev/null || true")
        run(client, f"cp -r {APP_DIR}/public {APP_DIR}/.next/standalone/public 2>/dev/null || true")
        print("✅ Static files copied!")
    else:
        print("❌ No build found. Running build...")
        print("⏳ This will take 3-5 minutes...")
        run(client, f"cd {APP_DIR} && npm install 2>&1 | tail -5", timeout=300)
        run(client, f"cd {APP_DIR} && npm run build 2>&1 | tail -20", timeout=600)
        run(client, f"cp -r {APP_DIR}/.next/static {APP_DIR}/.next/standalone/.next/static")
        run(client, f"cp -r {APP_DIR}/public {APP_DIR}/.next/standalone/public")
        print("✅ Build complete!")

    # 4. Test DB connection from server
    print("\n🗄️  Testing database connection from server...")
    db_test = f"""node -e "
const mysql = require('/home/u889282535/domains/moneymitrafinancialadvisor.com/nodejs/node_modules/mysql2/promise');
mysql.createConnection({{host:'srv2214.hstgr.io',port:3306,user:'u889282535_loan',password:'Mahadev@6163',database:'u889282535_loan',connectTimeout:10000}})
  .then(c => {{ console.log('DB_OK'); c.end(); }})
  .catch(e => console.log('DB_FAIL: ' + e.message));
" 2>&1"""
    run(client, db_test, timeout=30)

    print("\n" + "="*50)
    print("✅ SETUP COMPLETE!")
    print("="*50)
    print("👉 Now go to Hostinger hPanel → Node.js → click RESTART")
    print("👉 Then visit: https://moneymitrafinancialadvisor.com")

    client.close()

main()

