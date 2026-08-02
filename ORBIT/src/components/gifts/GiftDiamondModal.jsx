import { useEffect, useState } from "react";
import { X, Gem, Send } from "lucide-react";
import { sendDiamonds, getDiamondBalance } from "../../services/diamondService";

import "./GiftDiamondModal.css";

export default function GiftDiamondModal({
    isOpen,
    onClose,
    sender,
    receiver,
}) {
    const [balance, setBalance] = useState(0);
    const [amount, setAmount] = useState(1);
    const [message, setMessage] = useState("");

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !sender) return;

        loadBalance();
    }, [isOpen]);

    async function loadBalance() {
        const coins = await getDiamondBalance(sender.uid);
        setBalance(coins);
    }

    async function handleSend() {
        if (loading) return;

        try {
            setLoading(true);

            await sendDiamonds({
                senderId: sender.uid,
                receiverId: receiver.uid,
                amount,
                message,
            });

            alert("💎 Gift sent!");

            onClose();

        } catch (err) {
            alert(err.message);
        }

        setLoading(false);
    }

    if (!isOpen) return null;

    return (
        <div className="gift-overlay">

            <div className="gift-modal">

                <button
                    className="gift-close"
                    onClick={onClose}
                >
                    <X size={20} />
                </button>

                <div className="gift-icon">
                    <Gem size={50} />
                </div>

                <h2>Gift Diamonds</h2>

                <p>
                    Send Diamonds to
                </p>

                <h3>{receiver.displayName}</h3>

                <div className="gift-balance">

                    Your Balance

                    <strong>
                        💎 {balance}
                    </strong>

                </div>

                <div className="gift-amounts">

                    {[1, 5, 10, 25, 50, 100].map(value => (
                        <button
                            key={value}
                            className={
                                amount === value
                                    ? "selected"
                                    : ""
                            }
                            onClick={() => setAmount(value)}
                        >
                            💎 {value}
                        </button>
                    ))}

                </div>

                <textarea

                    placeholder="Add a message..."

                    value={message}

                    onChange={(e) =>
                        setMessage(e.target.value)
                    }

                />

                <button
                    className="gift-send"

                    disabled={loading}

                    onClick={handleSend}
                >

                    <Send size={18} />

                    {loading
                        ? "Sending..."
                        : "Send Gift"}

                </button>

            </div>

        </div>
    );
}