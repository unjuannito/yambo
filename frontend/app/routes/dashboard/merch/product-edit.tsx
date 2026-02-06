import { useParams } from "react-router";
import ProductEditor from "~/components/dashboard/ProductEditor";

export default function ProductEdit() {
    const { productId } = useParams<{ productId: string }>();
    return <ProductEditor mode="edit" productId={productId} />;

}