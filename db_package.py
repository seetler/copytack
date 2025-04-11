# importing the openai package and the authentication key.
import openai
from keys_hidden import *
import re
import time

# This sets up a set of default keys.
# Because this version only uses a single assistant, we just Sonoma.
# The dictionary comes from keys_hidden.py
client = openai.OpenAI(api_key=key_api_key0)
ASSISTANT_ID = assistant_dict["Sonoma"]

# Text clean up and format from chunks to display on HTML
def text_fix(text):

    # ✅ Handle cases where text is a list of OpenAI content objects
    if isinstance(text, list):
        text = " ".join([extract_text(item) for item in text])

    # ✅ Ensure text is a string before processing
    text = extract_text(text)

    # ✅ Replace double asterisks (**) with <strong> for bold text
    html_text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)

    # ✅ Replace newline characters (\n) with <br> for line breaks
    html_text = html_text.replace('\n', '<br>')

    # ✅ Remove any text between 【 and 】
    html_text = re.sub(r'【.*?】', '', html_text)

    return html_text

# Parses the OpenAI reponse
def extract_text(content):

    if isinstance(content, str):
        return content  # Already a string

    if hasattr(content, "text") and hasattr(content.text, "value"):
        return content.text.value  # ✅ Extract text from TextContentBlock
    
    if hasattr(content, "value"):
        return content.value  # ✅ Extract text from Text object

    if isinstance(content, list):
        return " ".join([extract_text(item) for item in content if item])  # Handle list of objects

    return str(content)  # Convert anything else to string



# Core function to get reposnes.
def stream_openai_response(prompt):
    
    # 1️⃣ Create a new thread for every request
    thread = client.beta.threads.create()
    thread_id = thread.id  # Unique for each request

    # 2️⃣ Add the user's message to the new thread
    client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=prompt
    )

    # 3️⃣ Run the assistant on the new thread
    run = client.beta.threads.runs.create(
        thread_id=thread_id,
        assistant_id=ASSISTANT_ID
    )

    # 4️⃣ This keep running until the status completes. This was originally set up for streaming, so the code is more complicated than needed for a single response.
    while True:
        run_status = client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run.id)

        #This only proceeds to the next step after the status is complete.
        if run_status.status == "completed":
            break
        time.sleep(1)  # Wait before checking again

    # 5️⃣ Retrieve the assistant's response and stream it to the frontend. This doesn't work for vector storage documents.
    messages = client.beta.threads.messages.list(thread_id=thread_id)

    # This is a loop for all messages. This is assuming the data is still streaming so it loops through every message received.
    # However, this we are waiting until the full stream is complete, this does not need a loop at all.
    for msg in messages.data:
        if msg.role == "assistant":
            formatted_text = text_fix(msg.content)  # ✅ Apply text cleanup
            yield formatted_text  # ✅ Convert string to bytes

    # Add this line to send an "END_RESPONSE" marker to the frontend
    # this is akin to concat(msg, b"\nEND_RESPONSE"). This set up is originally for streaming responses.
    yield b"\nEND_RESPONSE"