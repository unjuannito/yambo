import * as XLSX from "xlsx";
import type { Order } from "~/services/orderService";
import type { Product } from "~/services/productService";
import type { FamilyProduct } from "~/services/familyProductService";
import { ORDER_STATUS_CONFIG } from "~/constants/orderStatus";

interface ExportOrdersParams {
    orders: Order[];
    products: Product[];
    drops: FamilyProduct[];
    selectedDropIds?: string[];
}

/**
 * Exports orders to an Excel file with multiple sheets:
 * - General Summary: Overall statistics
 * - Summary by Drop: Statistics grouped by drop
 * - Product Sheets: One sheet per product with detailed orders
 * - All Orders: Complete list of all orders
 */
export async function exportOrdersToExcel({
    orders,
    products,
    drops,
    selectedDropIds = [],
}: ExportOrdersParams): Promise<void> {
    // Filter orders by selected drops if any
    const filteredOrders =
        selectedDropIds.length > 0
            ? orders.filter((order) =>
                  order.products.some((product) => {
                      const productData = products.find(
                          (p) => p.id === product.productId,
                      );
                      return (
                          productData?.familyProductId &&
                          selectedDropIds.includes(productData.familyProductId)
                      );
                  }),
              )
            : orders;

    const wb = XLSX.utils.book_new();

    // === 1. GENERAL SUMMARY SHEET ===
    createGeneralSummarySheet(wb, filteredOrders);

    // === 2. SUMMARY BY DROP ===
    createDropSummarySheet(wb, filteredOrders, products, drops);

    // === 3. SHEET PER PRODUCT ===
    createProductSheets(wb, filteredOrders, products, drops);

    // === 4. ALL ORDERS DETAIL SHEET ===
    createAllOrdersSheet(wb, filteredOrders, products, drops);

    // Generate file
    const dropsLabel =
        selectedDropIds.length > 0 ? `_${selectedDropIds.length}drops` : "";
    const fileName = `pedidos${dropsLabel}_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

/**
 * Creates the general summary sheet with overall statistics
 */
function createGeneralSummarySheet(wb: XLSX.WorkBook, orders: Order[]): void {
    const summaryData = [
        { A: "RESUMEN GENERAL DE PEDIDOS", B: "" },
        { A: "", B: "" },
        { A: "Métrica", B: "Valor" },
        { A: "Total de Pedidos", B: orders.length },
        {
            A: "Total de Productos Vendidos",
            B: { f: `SUM('Todos los Pedidos'!I:I)` },
        },
        {
            A: "Ingresos Totales (€)",
            B: { f: `SUM('Todos los Pedidos'!L:L)` },
        },
        { A: "", B: "" },
        { A: "PEDIDOS POR ESTADO", B: "" },
    ];

    const statusCounts: Record<string, number> = {};
    orders.forEach((order) => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    Object.entries(statusCounts).forEach(([status, count]) => {
        const statusLabel =
            ORDER_STATUS_CONFIG[status as keyof typeof ORDER_STATUS_CONFIG]
                ?.label || status;
        summaryData.push({ A: statusLabel, B: count });
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryData, {
        skipHeader: true,
    });
    wsSummary["!cols"] = [{ wch: 35 }, { wch: 20 }];

    // Freeze first 3 rows
    wsSummary["!freeze"] = { xSplit: 0, ySplit: 3 };

    // Merge title cell
    wsSummary["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen General");
}

/**
 * Creates summary sheet grouped by drop
 */
function createDropSummarySheet(
    wb: XLSX.WorkBook,
    orders: Order[],
    products: Product[],
    drops: FamilyProduct[],
): void {
    // Identify all unique drops
    const uniqueDrops = new Map<string, string>();

    orders.forEach((order) => {
        order.products.forEach((product) => {
            const productData = products.find(
                (p) => p.id === product.productId,
            );
            const dropId = productData?.familyProductId || "sin-drop";
            const dropName =
                dropId === "sin-drop"
                    ? "Sin Drop"
                    : drops.find((d) => d.id === dropId)?.name || "Desconocido";
            uniqueDrops.set(dropId, dropName);
        });
    });

    const dropSummaryData: any[] = [
        { A: "RESUMEN POR DROP", B: "", C: "", D: "" },
    ];

    // Add header row
    dropSummaryData.push({
        A: "Drop",
        B: "Items / Líneas",
        C: "Productos Vendidos",
        D: "Ingresos (€)",
    });

    // Add data rows with formulas
    let currentRow = 3;
    Array.from(uniqueDrops.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((drop) => {
            dropSummaryData.push({
                A: drop.name,
                B: { f: `COUNTIF('Todos los Pedidos'!G:G, "${drop.name}")` },
                C: {
                    f: `SUMIF('Todos los Pedidos'!G:G, "${drop.name}", 'Todos los Pedidos'!I:I)`,
                },
                D: {
                    f: `SUMIF('Todos los Pedidos'!G:G, "${drop.name}", 'Todos los Pedidos'!L:L)`,
                },
            });
            currentRow++;
        });

    // Add totals row
    const totalRow = currentRow; // Row of TOTALS
    dropSummaryData.push({
        A: "TOTALES",
        B: { f: `SUM(B3:B${totalRow - 1})` },
        C: { f: `SUM(C3:C${totalRow - 1})` },
        D: { f: `SUM(D3:D${totalRow - 1})` },
    });

    const wsDropSummary = XLSX.utils.json_to_sheet(dropSummaryData, {
        skipHeader: true,
    });
    wsDropSummary["!cols"] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 22 },
        { wch: 18 },
    ];

    // Freeze panes
    wsDropSummary["!freeze"] = { xSplit: 0, ySplit: 2 };

    // Merge title
    wsDropSummary["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

    XLSX.utils.book_append_sheet(wb, wsDropSummary, "Resumen por Drop");
}

/**
 * Creates one sheet per product with detailed order information
 */
function createProductSheets(
    wb: XLSX.WorkBook,
    orders: Order[],
    products: Product[],
    drops: FamilyProduct[],
): void {
    const productStats: Record<
        string,
        {
            name: string;
            drop: string;
            orders: Array<{
                orderId: string;
                cliente: string;
                fecha: string;
                cantidad: number;
                precio: number;
                configRaw: string;
                configParsed: Record<string, any>;
                subtotal: number;
            }>;
        }
    > = {};

    orders.forEach((order) => {
        order.products.forEach((product) => {
            const productData = products.find(
                (p) => p.id === product.productId,
            );
            const dropName = productData?.familyProductId
                ? drops.find((d) => d.id === productData.familyProductId)
                      ?.name || "Sin Drop"
                : "Sin Drop";

            const productKey = product.productId;
            if (!productStats[productKey]) {
                productStats[productKey] = {
                    name: product.productName || product.productId,
                    drop: dropName,
                    orders: [],
                };
            }

            // Parse configuration
            let configParsed: Record<string, any> = {};
            try {
                if (product.configuration && product.configuration !== "{}") {
                    configParsed = JSON.parse(product.configuration);
                }
            } catch (e) {
                console.error("Error parsing config:", e);
            }

            productStats[productKey].orders.push({
                orderId: order.id,
                cliente: order.user?.name || "N/A",
                fecha: new Date(order.createdAt).toLocaleDateString("es-ES"),
                cantidad: product.quantity,
                precio: product.price,
                configRaw: product.configuration || "",
                configParsed: configParsed,
                subtotal: product.price * product.quantity,
            });
        });
    });

    // Sort products by total quantity sold (descending)
    const sortedProducts = Object.entries(productStats).sort((a, b) => {
        const totalA = a[1].orders.reduce((sum, o) => sum + o.cantidad, 0);
        const totalB = b[1].orders.reduce((sum, o) => sum + o.cantidad, 0);
        return totalB - totalA;
    });

    sortedProducts.forEach(([productId, stats]) => {
        const wsProduct = createProductSheet(stats);

        // Sanitize sheet name (max 31 chars, no special chars)
        let sheetName = stats.name.substring(0, 31);
        sheetName = sheetName.replace(/[\\/:*?\[\]]/g, "-");
        XLSX.utils.book_append_sheet(wb, wsProduct, sheetName);
    });
}

/**
 * Creates a single product sheet with dynamic configuration columns
 */
function createProductSheet(stats: {
    name: string;
    drop: string;
    orders: Array<{
        orderId: string;
        cliente: string;
        fecha: string;
        cantidad: number;
        precio: number;
        configParsed: Record<string, any>;
        subtotal: number;
    }>;
}): XLSX.WorkSheet {
    // Identify all unique configuration keys for this product
    const configKeys = new Set<string>();
    stats.orders.forEach((order) => {
        Object.keys(order.configParsed).forEach((key) => configKeys.add(key));
    });
    const configKeysArray = Array.from(configKeys).sort();

    // Header rows with summary
    const headerData = [
        { A: "DETALLE DE PRODUCTO", B: "" },
        { A: "Producto:", B: stats.name },
        { A: "Drop:", B: stats.drop },
        {
            A: "Total Pedidos:",
            B: { f: `COUNTA(A7:A${6 + stats.orders.length})` },
        },
        { A: "" },
    ];

    // Build column headers dynamically
    const baseHeaders = ["ID Pedido", "Cliente", "Fecha"];
    const configHeaders = configKeysArray;
    const endHeaders = ["Cantidad", "Precio (€)", "Subtotal (€)"];
    const allHeaders = [...baseHeaders, ...configHeaders, ...endHeaders];

    // Calculate column positions
    const qtyColIndex = 3 + configKeysArray.length;
    const priceColIndex = qtyColIndex + 1;
    const subtotalColIndex = priceColIndex + 1;

    const qtyCol = getColLetter(qtyColIndex);
    const priceCol = getColLetter(priceColIndex);
    const subtotalCol = getColLetter(subtotalColIndex);

    // Create column headers object
    const columnHeadersObj: any = {};
    allHeaders.forEach((header, i) => {
        columnHeadersObj[getColLetter(i)] = header;
    });

    // Data rows starting at row 7 (6 in 0-index)
    const dataRows = stats.orders.map((o, i) => {
        const rowObj: any = {
            A: o.orderId,
            B: o.cliente,
            C: o.fecha,
        };

        // Add config columns
        configKeysArray.forEach((key, keyIdx) => {
            const colLetter = getColLetter(3 + keyIdx);
            const value = o.configParsed[key];

            if (typeof value === "boolean") {
                rowObj[colLetter] = value ? "Sí" : "No";
            } else if (value === null || value === undefined) {
                rowObj[colLetter] = "-";
            } else if (typeof value === "object" && value.label) {
                rowObj[colLetter] = value.label;
            } else {
                rowObj[colLetter] = String(value);
            }
        });

        // Add quantity, price, and subtotal with formula
        rowObj[qtyCol] = o.cantidad;
        rowObj[priceCol] = o.precio;
        rowObj[subtotalCol] = { f: `${qtyCol}${7 + i}*${priceCol}${7 + i}` };

        return rowObj;
    });

    // Totals row
    const dataRowCount = stats.orders.length;
    const totalsRowIndex = 7 + dataRowCount;
    const totalsRow: any = {};

    for (let i = 0; i < qtyColIndex - 1; i++) {
        totalsRow[getColLetter(i)] = "";
    }
    totalsRow[getColLetter(qtyColIndex - 1)] = "TOTALES:";
    totalsRow[qtyCol] = { f: `SUM(${qtyCol}7:${qtyCol}${6 + dataRowCount})` };
    totalsRow[priceCol] = {
        f: `AVERAGE(${priceCol}7:${priceCol}${6 + dataRowCount})`,
    };
    totalsRow[subtotalCol] = {
        f: `SUM(${subtotalCol}7:${subtotalCol}${6 + dataRowCount})`,
    };

    // Combine all data
    const allData = [...headerData, columnHeadersObj, ...dataRows, totalsRow];

    const wsProduct = XLSX.utils.json_to_sheet(allData, { skipHeader: true });

    // Set column widths dynamically
    const colWidths = [
        { wch: 18 }, // ID Pedido
        { wch: 28 }, // Cliente
        { wch: 14 }, // Fecha
    ];
    configKeysArray.forEach(() => colWidths.push({ wch: 20 }));
    colWidths.push(
        { wch: 12 }, // Cantidad
        { wch: 14 }, // Precio
        { wch: 15 }, // Subtotal
    );
    wsProduct["!cols"] = colWidths;

    // Freeze panes (freeze first 6 rows and first column)
    wsProduct["!freeze"] = { xSplit: 1, ySplit: 6 };

    // Merge title cell
    wsProduct["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: allHeaders.length - 1 } },
    ];

    // Auto-filter on headers
    const lastColLetter = getColLetter(allHeaders.length - 1);
    wsProduct["!autofilter"] = {
        ref: `A6:${lastColLetter}${6 + dataRowCount}`,
    };

    // Data validation for Cantidad column
    wsProduct["!dataValidation"] = wsProduct["!dataValidation"] || [];
    wsProduct["!dataValidation"].push({
        type: "whole",
        operator: "greaterThan",
        formula1: "0",
        sqref: `${qtyCol}7:${qtyCol}${6 + dataRowCount}`,
        showErrorMessage: true,
        errorTitle: "Cantidad inválida",
        error: "La cantidad debe ser un número entero mayor que 0",
    });

    return wsProduct;
}

/**
 * Creates the "All Orders" detailed sheet
 */
function createAllOrdersSheet(
    wb: XLSX.WorkBook,
    orders: Order[],
    products: Product[],
    drops: FamilyProduct[],
): void {
    const headerRow = {
        A: "ID Pedido",
        B: "Cliente",
        C: "Email",
        D: "Estado",
        E: "Fecha",
        F: "Producto",
        G: "Drop",
        H: "Fin Drop",
        I: "Cantidad",
        J: "Precio",
        K: "Configuración",
        L: "Subtotal",
    };

    const allOrdersData: any[] = [headerRow];

    orders.forEach((order) => {
        if (!order.products || order.products.length === 0) {
            allOrdersData.push({
                A: order.id,
                B: order.user?.name || "N/A",
                C: order.user?.email || "",
                D:
                    ORDER_STATUS_CONFIG[
                        order.status as keyof typeof ORDER_STATUS_CONFIG
                    ]?.label || order.status,
                E: new Date(order.createdAt).toLocaleString("es-ES"),
                F: "",
                G: "",
                H: "",
                I: 0,
                J: 0,
                K: "",
                L: 0,
            });
        } else {
            order.products.forEach((product, idx) => {
                const productData = products.find(
                    (p) => p.id === product.productId,
                );
                const productDrop = productData?.familyProductId
                    ? drops.find(
                          (drop) => drop.id === productData.familyProductId,
                      )
                    : null;

                const rowNum = allOrdersData.length + 1;
                allOrdersData.push({
                    A: order.id,
                    B: order.user?.name || "N/A",
                    C: order.user?.email || "",
                    D:
                        ORDER_STATUS_CONFIG[
                            order.status as keyof typeof ORDER_STATUS_CONFIG
                        ]?.label || order.status,
                    E: new Date(order.createdAt).toLocaleString("es-ES"),
                    F: product.productName || product.productId,
                    G: productDrop?.name || "",
                    H: productDrop?.endTms
                        ? new Date(productDrop.endTms).toLocaleDateString(
                              "es-ES",
                          )
                        : "",
                    I: product.quantity,
                    J: product.price,
                    K: product.configuration || "",
                    L: { f: `I${rowNum}*J${rowNum}` }, // Formula for subtotal
                });
            });
        }
    });

    // Add totals row
    const totalRow = allOrdersData.length + 1;
    allOrdersData.push({
        A: "",
        B: "",
        C: "",
        D: "",
        E: "",
        F: "",
        G: "",
        H: "TOTALES:",
        I: { f: `SUM(I2:I${totalRow - 1})` },
        J: { f: `AVERAGE(J2:J${totalRow - 1})` },
        K: "",
        L: { f: `SUM(L2:L${totalRow - 1})` },
    });

    const wsAllOrders = XLSX.utils.json_to_sheet(allOrdersData, {
        skipHeader: true,
    });

    wsAllOrders["!cols"] = [
        { wch: 12 }, // ID Pedido
        { wch: 22 }, // Cliente
        { wch: 28 }, // Email
        { wch: 18 }, // Estado
        { wch: 18 }, // Fecha
        { wch: 25 }, // Producto
        { wch: 18 }, // Drop
        { wch: 14 }, // Fin Drop
        { wch: 10 }, // Cantidad
        { wch: 12 }, // Precio
        { wch: 35 }, // Configuración
        { wch: 14 }, // Subtotal
    ];

    // Freeze panes (freeze headers and first column)
    wsAllOrders["!freeze"] = { xSplit: 1, ySplit: 1 };

    // Auto-filter on headers
    wsAllOrders["!autofilter"] = { ref: `A1:L${totalRow - 1}` };

    XLSX.utils.book_append_sheet(wb, wsAllOrders, "Todos los Pedidos");
}

/**
 * Converts a column index to Excel column letter (A, B, C, ..., Z, AA, AB, ...)
 */
function getColLetter(index: number): string {
    let letter = "";
    while (index >= 0) {
        letter = String.fromCharCode(65 + (index % 26)) + letter;
        index = Math.floor(index / 26) - 1;
    }
    return letter;
}
