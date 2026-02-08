
import { visualizeSchema, fetchBusinessData } from "./src/server/actions/cortex-tools";

async function test() {
    console.log("🚀 Testing Supabase Connection & Cortex Tools...");

    try {
        console.log("\n1. Testing Schema Visualization...");
        const schema = await visualizeSchema();
        if (schema.error) {
            console.error("❌ Schema Error:", schema.error);
        } else {
            console.log("✅ Schema loaded successfully!");
            console.log(`- Nodes: ${schema.nodes.length}`);
            console.log(`- Edges: ${schema.edges.length}`);
            console.log(`- Tables found: ${schema.nodes.map(n => n.id).join(", ")}`);
        }

        console.log("\n2. Testing Data Fetching (Customers)...");
        const customers = await fetchBusinessData("customers", 5);
        if (customers.status === "ok" && customers.entity === "customers") {
            console.log(`✅ Fetched ${customers.data.length} customers successfully!`);
            console.table(customers.data.map(c => ({ id: c.id, name: c.name, email: c.email })));
        } else if (customers.status === "error") {
            console.error("❌ Data Fetch Error:", customers.message);
        }

        console.log("\n3. Testing Data Fetching (Orders)...");
        const orders = await fetchBusinessData("orders", 5);
        if (orders.status === "ok" && orders.entity === "orders") {
            console.log(`✅ Fetched ${orders.data.length} orders successfully!`);
            console.table(orders.data.map(o => ({ id: o.id, amount: o.amount, customer: o.customer?.name })));
        } else if (orders.status === "error") {
            console.error("❌ Data Fetch Error:", orders.message);
        }

    } catch (error) {
        console.error("💥 Critical Failure during test:", error);
    }
}

test();
