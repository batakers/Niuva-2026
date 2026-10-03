import { PublicLoadingState } from "@/components/niuva/public-loading-state";
import { systemCopy } from "@/components/niuva/system-state-copy";

export default function CartLoading() {
  return <PublicLoadingState scope="cart" label={systemCopy.loading.cart} />;
}
