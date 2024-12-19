import streamlit as st
from utils.api import authenticate_user
import requests
import asyncio

# Define the base URL of the backend
API_BASE_URL = "https://hederalearn.onrender.com"

# Function to authenticate the user asynchronously
async def authenticate_user_ui(username):
    try:
        is_authenticated = await authenticate_user(username)
        if is_authenticated:
            st.session_state.authenticated = True
            st.session_state.username = username
            st.success("Authentication successful!")
            st.experimental_rerun()
        else:
            st.error("Authentication failed. Please check your credentials.")
            st.write("Debug Info: Authentication failed.")
            st.write(f"Response from API: Authentication failed for user {username}.")
    except Exception as e:
        st.error(f"Error during authentication: {str(e)}")
        st.write(f"Debug Info: Authentication failed for user {username}.")
        st.experimental_rerun()

# Resources page render
def render():
    st.title("Resources")

    # Upload section
    st.subheader("Upload Resource")
    title = st.text_input("Title")
    subject = st.text_input("Subject")
    price = st.number_input("Price (in HBAR)", min_value=0)
    file = st.file_uploader("Upload PDF", type=["pdf"])

    if st.button("Upload Resource"):
        if title and subject and price and file:
            files = {"file": (file.name, file, "application/pdf")}
            data = {"title": title, "subject": subject, "price": price}
            response = requests.post(f"{API_BASE_URL}/api/resources/upload", data=data, files=files)

            st.write(f"Response Status Code: {response.status_code}")
            st.write(f"Response Text: {response.text}")

            if response.status_code == 200:
                st.success("Resource uploaded successfully!")
            else:
                st.error(f"Error uploading resource: {response.json().get('error', 'Unknown error')}")

    # Pagination controls
    st.subheader("Available Resources")
    page = st.number_input("Page", min_value=1, value=1, step=1)
    limit = st.number_input("Limit", min_value=1, value=10, step=1)

    params = {"page": page, "limit": limit}
    response = requests.get(f"{API_BASE_URL}/api/resources", params=params)

    if response.status_code == 200:
        resources = response.json()
        if "data" in resources and isinstance(resources["data"], list):
            for resource in resources["data"]:
                st.write(f"**Title:** {resource['title']}, **Subject:** {resource['subject']}, **Price:** {resource['price']} HBAR")
                if st.button(f"Download {resource['title']}", key=resource["_id"]):
                    download_response = requests.get(f"{API_BASE_URL}/api/resources/download/{resource['_id']}")
                    if download_response.status_code == 200:
                        st.success("Download started.")
                        with open(resource["title"] + ".pdf", "wb") as f:
                            f.write(download_response.content)
                    else:
                        st.error(f"Error downloading resource: {download_response.json().get('error', 'Unknown error')}")
        else:
            st.write("No resources found on this page.")
    else:
        st.error(f"Error fetching resources: {response.json().get('error', 'Unknown error')}")

# Render the resources page
render()
