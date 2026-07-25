export const getAIResponse = async (
  chatHistory,
  userMessage
) => {
  try {
    const res = await fetch(
      "https://website-ri0q.onrender.com/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Backend Error:", text);
      return "Server error.";
    }

    const data = await res.json();

    return data.reply || "No response generated.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Something went wrong.";
  }
};