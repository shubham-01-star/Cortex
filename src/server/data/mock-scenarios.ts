
export const MOCK_SCENARIOS = {
    // Scenario 1: Visualize Schema
    // Trigger keywords: "show schema", "visualize database", "erd"
    SCHEMA: {
        nodes: [
            {
                id: "Users",
                type: "tableNode",
                position: { x: 0, y: 0 },
                data: {
                    label: "Users",
                    fields: [
                        { name: "id", type: "UUID", isId: true },
                        { name: "email", type: "VARCHAR(255)", isId: false },
                        { name: "name", type: "VARCHAR(100)", isId: false },
                        { name: "role", type: "ENUM('ADMIN', 'USER')", isId: false },
                        { name: "createdAt", type: "TIMESTAMP", isId: false },
                    ]
                }
            },
            {
                id: "Orders",
                type: "tableNode",
                position: { x: 400, y: 0 },
                data: {
                    label: "Orders",
                    fields: [
                        { name: "id", type: "UUID", isId: true },
                        { name: "userId", type: "UUID", isId: false },
                        { name: "amount", type: "DECIMAL(10,2)", isId: false },
                        { name: "status", type: "ENUM('PENDING', 'COMPLETED')", isId: false },
                        { name: "date", type: "TIMESTAMP", isId: false },
                    ]
                }
            },
            {
                id: "Products",
                type: "tableNode",
                position: { x: 200, y: 300 },
                data: {
                    label: "Products",
                    fields: [
                        { name: "id", type: "UUID", isId: true },
                        { name: "name", type: "VARCHAR(255)", isId: false },
                        { name: "price", type: "DECIMAL(10,2)", isId: false },
                        { name: "stock", type: "INTEGER", isId: false },
                    ]
                }
            }
        ],
        edges: [
            {
                id: "e1",
                source: "Users",
                target: "Orders",
                label: "userId -> id"
            }
        ]
    },

    // Scenario 2: Fetch Business Data (Table)
    // Trigger keywords: "show orders", "list users", "data from table"
    TABLE_ORDERS: {
        entity: "Orders",
        data: [
            { id: "ord_001", amount: 120.50, status: "COMPLETED", date: "2023-10-01", customer: { email: "alice@example.com" } },
            { id: "ord_002", amount: 450.00, status: "PENDING", date: "2023-10-02", customer: { email: "bob@example.com" } },
            { id: "ord_003", amount: 89.99, status: "COMPLETED", date: "2023-10-03", customer: { email: "charlie@example.com" } },
            { id: "ord_004", amount: 1200.00, status: "CANCELLED", date: "2023-10-04", customer: { email: "david@example.com" } },
            { id: "ord_005", amount: 35.00, status: "COMPLETED", date: "2023-10-05", customer: { email: "eve@example.com" } },
        ]
    },

    // Scenario 3: Visualize Analytics (Chart)
    // Trigger keywords: "show revenue", "analytics", "chart"
    CHART_REVENUE: {
        title: "Monthly Revenue",
        type: "bar",
        data: [
            { name: "Jan", value: 4000 },
            { name: "Feb", value: 3000 },
            { name: "Mar", value: 2000 },
            { name: "Apr", value: 2780 },
            { name: "May", value: 1890 },
            { name: "Jun", value: 2390 },
            { name: "Jul", value: 3490 },
        ],
        xAxisKey: "name",
        dataKey: "value",
        description: "Revenue performance over the last 7 months."
    }
};
