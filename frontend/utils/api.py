import requests
import subprocess
import os
import asyncio

API_BASE_URL = "https://hederalearn.onrender.com"

def process_payment(sender_account_id, sender_private_key, recipient_account_id, amount):
    payload = {
        "senderAccountId": sender_account_id,
        "senderPrivateKey": sender_private_key,
        "recipientAccountId": recipient_account_id,
        "amount": amount,
    }

    # Make the POST request to the payments API
    try:
        response = requests.post(f"{API_BASE_URL}/payments", json=payload)
        response.raise_for_status()  # Raise an exception for HTTP errors
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error processing payment: {e}")
        return {"error": str(e)}  # Return error message


# Function to authenticate user using HCS (via JavaScript backend)
async def authenticate_user(username):
    try:
        # Run Node.js script asynchronously
        result = await asyncio.create_subprocess_exec(
            'node', '../utils/hcs.js', username,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd='../backend/utils'
        )
        stdout, stderr = await result.communicate()

        if "true" in stdout.decode().lower():  # Adjust based on actual output
            return True
        else:
            print(f"Node.js stderr: {stderr.decode()}")
            return False
    except Exception as e:
        print(f"Error in user authentication: {e}")
        return False