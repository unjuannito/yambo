import type { Issue, IssueDetail } from '~/types/issueType';
import type { Order, OrderProduct } from '~/services/orderService';

export function getIssueOrderedProductIds(issue: Issue | IssueDetail): string[] {
    if (issue.orderedProductIds && issue.orderedProductIds.length > 0) {
        return issue.orderedProductIds;
    }

    return issue.orderedProductId ? [issue.orderedProductId] : [];
}

export function getProductName(product?: OrderProduct): string {
    if (!product) {
        return "Producto";
    }

    return product.productName || product.productId;
}

export function resolveProductName(order: Order, issue: Issue): string {
    const relatedIds = getIssueOrderedProductIds(issue);
    const names = relatedIds
        .map((orderedProductId) => order.products.find((item) => item.id === orderedProductId))
        .filter((product): product is OrderProduct => Boolean(product))
        .map((product) => getProductName(product));

    if (names.length === 0) {
        return "Producto";
    }

    if (names.length === 1) {
        return names[0];
    }

    return `${names[0]} +${names.length - 1}`;
}

export function formatConfiguration(configStr: string): string {
    try {
        const config = JSON.parse(configStr);
        return Object.entries(config)
            .map(([key, value]) => {
                if (typeof value === 'boolean') {
                    return value ? key : null;
                }
                return `${key}: ${value}`;
            })
            .filter(Boolean)
            .join(', ');
    } catch {
        return configStr;
    }
}
