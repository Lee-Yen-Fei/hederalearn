import { TransferTransaction, Hbar } from "@hashgraph/sdk";
import client from "../utils/hedera.js";

export const processPayment = async (req, res) => {
  const { senderAccountId, senderPrivateKey, recipientAccountId, amount } = req.body;

  // Validate required fields
  if (!senderAccountId || !senderPrivateKey || !recipientAccountId || !amount) {
    return res.status(400).json({ error: "Missing required fields: senderAccountId, senderPrivateKey, recipientAccountId, amount" });
  }

  // Validate that amount is a positive number
  if (amount <= 0) {
    return res.status(400).json({ error: "Amount must be a positive value." });
  }

  try {
    // Check sender's account balance
    const senderBalance = await client.getAccountBalance(senderAccountId);
    const transactionFee = 1000000; // Example fee in tinybars
    const totalAmount = amount + transactionFee; // Total amount including fee

    if (senderBalance.hbars < totalAmount) {
      return res.status(400).json({ error: "Insufficient HBAR balance to cover the transfer and transaction fee." });
    }

    // Create the transaction to transfer funds
    const transferTx = await new TransferTransaction()
      .addHbarTransfer(senderAccountId, Hbar.fromTinybars(-amount))
      .addHbarTransfer(recipientAccountId, Hbar.fromTinybars(amount))
      .setTransactionMemo("Payment for Resource Purchase")
      .freezeWith(client)
      .sign(senderPrivateKey); // Sign the transaction

    // Execute the transaction
    const response = await transferTx.execute(client);

    // Wait for the transaction receipt to confirm success
    const receipt = await response.getReceipt(client);

    // Log the transaction ID for debugging purposes
    console.log(`Transaction successful: ${receipt.transactionId.toString()}`);

    // Respond with the transaction ID
    res.status(200).json({ status: "Success", transactionId: receipt.transactionId.toString() });
  } catch (error) {
    console.error("Payment Error:", error);
    res.status(500).json({ error: "Transaction failed due to an error: " + error.message });
  }
};