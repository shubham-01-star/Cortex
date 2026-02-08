import { sendInvitationEmail } from "../src/server/services/mail";

// Manual Trigger for testing
async function main() {
    const targetEmail = "shubhamsingh8348@gmail.com";
    console.log(`🚀 [Cortex Test] Initializing email dispatch to: ${targetEmail}`);

    try {
        const result = await sendInvitationEmail({
            to: targetEmail,
            name: "Shubham Singh",
            role: "ADMIN",
            token: "test-token-" + Math.random().toString(36).substring(7),
            position: "Commander-in-Chief"
        });

        if (result.success) {
            console.log("✅ [Success] Email sent successfully!");
            console.log("Data:", JSON.stringify(result.data, null, 2));
        } else {
            console.error("❌ [Error] Failed to send email.");
            console.error("Error Details:", JSON.stringify(result.error, null, 2));
        }
    } catch (err) {
        console.error("💥 [Fatal] Unexpected error during test dispatch:");
        console.error(err);
    }
}

main();
