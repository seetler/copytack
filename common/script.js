// 1. Creates a JS variable for the objects in the HTML Page - These are all UI improvements, and does not affect any core functions.
document.addEventListener("DOMContentLoaded", function () {
    const sendButton = document.getElementById("sendButton");
    const introBox = document.getElementById("intro"); // Select the intro box
    const fillerBox = document.getElementById("fillerBox"); // Select the loading message box
    const promptInput = document.getElementById("prompt"); // Select the input box
    const responseDiv = document.getElementById("response"); // Select the response box

    // Mobile UI feature, it zooms out to show the viewport width after a question is submitted.
    sendButton.addEventListener("click", function () {
        submitPrompt();
        zoomOut();
    });

    // General UI - Listen for "Enter" key press inside the input field
    promptInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) { 
            event.preventDefault(); // **Prevents adding a new line in the textarea**
            submitPrompt();
            zoomOut(); // ✅ Zoom out after pressing enter
        }
    });

    // Various UI after a prompt is submitted.
    function submitPrompt() {
        let promptText = promptInput.value.trim();
    
        if (!promptText) {
            promptText = "Where can I get help with senior housing assistance?";
            promptInput.value = promptText;
        }
    
        if (introBox) {
            introBox.classList.add("hidden"); // Hide the intro box
        }
    
        if (fillerBox) {
            showTextbox(); // ✅ Start loading animation from the beginning
        }
    
        // This triggers the sendPrompt function below.
        sendPrompt(promptText);
    }

    // UI only, zooms out to viewport width.
    function zoomOut() {
        // ✅ Removes focus from the input field
        promptInput.blur();

        // ✅ Reset viewport scale (for mobile)
        document.querySelector("meta[name=viewport]").setAttribute(
            "content",
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        );
    }
});

// 2. This is the core function triggered by the submitPrompt button.
async function sendPrompt(prompt) {
    let responseDiv = document.getElementById("response");
    let fillerBox = document.getElementById("fillerBox"); // Select the loading message box

    // Two UI only changes.
    responseDiv.innerHTML = ""; // Clear previous response
    responseDiv.classList.remove("hidden"); // Make response box visible

    // It's now trying to fetch things from /chat, which calls the OpenAI function.
    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            responseDiv.innerHTML = "<p style='color:red;'>Error: Failed to get a response.</p>";
            if (fillerBox) {
                fillerBox.classList.add("hidden"); // Hide loading message on error
            }
            return;
        }

        //Setting up variables from streaming responses.
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let completeResponse = "";

        //It's trying to stream a reponse, but Chats with Vector Storage can't offer streamed responses, only full complete answer.
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            let chunk = decoder.decode(value, { stream: true });

            // The db_package.py inserts a End Reponse to note the end, and this parses that keyword.
            if (chunk.includes("END_RESPONSE")) {
                chunk = chunk.replace("END_RESPONSE", ""); // **Remove marker but keep text**
                completeResponse += chunk;
                responseDiv.innerHTML = completeResponse; // **Ensure final response is shown**
                break;
            }

            completeResponse += chunk;
            responseDiv.innerHTML = completeResponse; // Update response box
        }

        // Some more UI changes.
        if (fillerBox) {
            fillerBox.classList.add("hidden");
        }
    // This ends the try statement, so then it shows the error here.
    } catch (error) {
        responseDiv.innerHTML = `<p style='color:red;'>Error: ${error.message}</p>`;
        if (fillerBox) {
            fillerBox.classList.add("hidden"); // Ensure loading box is hidden on error
        }
    }
}
