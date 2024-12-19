import streamlit as st
import requests

st.set_page_config(page_title="Search for Tutors", page_icon="🌍")
st.title("Search for Tutors")

# Search filters
st.subheader("Search Filters")
subject = st.text_input("Enter Subject (e.g., Mathematics):")
location = st.text_input("Enter Location (e.g., Penang):")
max_rate = st.number_input("Maximum Hourly Rate (HBAR):", min_value=0, step=10)

# Placeholder for search results
results_placeholder = st.empty()

# Function to fetch tutors from the backend
def search_tutors(subject=None, location=None, max_rate=None, page=1, limit=10):
    base_url = "http://127.0.0.1:5000/api/tutors"
    params = {}
    if subject:
        params["subject"] = subject
    if location:
        params["location"] = location
    if max_rate:
        params["max_rate"] = max_rate
    params["page"] = page
    params["limit"] = limit
    
    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": f"Error fetching tutors: {e}"}

if st.button("Search"):
    with st.spinner("Searching for tutors..."):
        tutors = search_tutors(subject, location, max_rate)  # Fetch tutor data
        
        with results_placeholder.container():
            # Display search results
            if isinstance(tutors, dict) and "error" in tutors:  # Check for errors in dict
                st.error(tutors["error"])
            elif isinstance(tutors, list) and len(tutors) > 0:  # If tutors is a list
                st.success(f"Found {len(tutors)} tutor(s):")
                for tutor in tutors:
                    st.subheader(tutor.get("name", "Unknown Name"))
                    st.write(f"**Subject:** {', '.join(tutor.get('subjects', []))}")
                    st.write(f"**Rate:** {tutor.get('hourlyRate', 'N/A')} HBAR")
                    st.write(f"**Rating:** {tutor.get('rating', 'N/A')} ⭐")
                    st.write(f"**Location:** {tutor.get('location', 'N/A')}")
                    st.write("---")  # Divider between tutors
            elif isinstance(tutors, dict) and "data" in tutors and len(tutors["data"]) > 0:  # If tutors is a dict with "data" key
                st.success(f"Found {len(tutors['data'])} tutor(s):")
                for tutor in tutors["data"]:
                    st.subheader(tutor.get("name", "Unknown Name"))
                    st.write(f"**Subject:** {', '.join(tutor.get('subjects', []))}")
                    st.write(f"**Rate:** {tutor.get('hourlyRate', 'N/A')} HBAR")
                    st.write(f"**Rating:** {tutor.get('rating', 'N/A')} ⭐")
                    st.write(f"**Location:** {tutor.get('location', 'N/A')}")
                    st.write("---")  # Divider between tutors
            else:
                st.warning("No tutors found.")
