import subprocess, sys, io

try:
    import paramiko
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'paramiko', '-q'])
    import paramiko

HOST = '145.79.58.124'
PORT = 65002
USER = 'u889282535'
PASS = 'Mahadev@6163'
REMOTE_PATH = '/home/u889282535/domains/moneymitrafinancialadvisor.com/nodejs/.env'

# Exact .env content — %40 is URL-encoded @
ENV_LINES = [
    'DATABASE_URL="mysql://u889282535_loan:Mahadev%406163@srv2214.hstgr.io:3306/u889282535_loan?connection_limit=3&connect_timeout=30&pool_timeout=30"',
    'DIRECT_DATABASE_URL="mysql://u889282535_loan:Mahadev%406163@srv2214.hstgr.io:3306/u889282535_loan"',
    'NEXTAUTH_SECRET=super-secret-nextauth-key-loan-app-2024',
    'NEXTAUTH_URL=https://moneymitrafinancialadvisor.com',
    'NODE_ENV=production',
    'CRON_SECRET=moneymitra-cron-secret-2024',
    '',
]
ENV_CONTENT = '\n'.join(ENV_LINES)

print(f'Connecting via SFTP to {HOST}:{PORT}...')
try:
    transport = paramiko.Transport((HOST, PORT))
    transport.connect(username=USER, password=PASS)
    sftp = paramiko.SFTPClient.from_transport(transport)
    print('SFTP connected!')
except Exception as e:
    print(f'SFTP connection failed: {e}')
    sys.exit(1)

try:
    data = ENV_CONTENT.encode('utf-8')
    sftp.putfo(io.BytesIO(data), REMOTE_PATH)
    print(f'\nSUCCESS: .env uploaded to {REMOTE_PATH}')
    print(f'File size: {len(data)} bytes')

    # Read back to verify
    print('\n--- Verifying file contents ---')
    with sftp.open(REMOTE_PATH, 'r') as f:
        contents = f.read().decode()
    print(contents)
    print('--- End of file ---')
    print('\nDONE! Now restart the Node.js app in Hostinger hPanel.')

except Exception as e:
    print(f'Upload failed: {e}')
finally:
    sftp.close()
    transport.close()
