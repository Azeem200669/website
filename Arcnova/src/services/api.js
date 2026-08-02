export const sendMessageToAI = async (message) => {
  const response = await fetch(
    "https://website-7ngm.onrender.com/api/chat",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data.reply;
};  