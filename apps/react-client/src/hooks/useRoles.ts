import { useUserStore } from "@react-client/common/store/userStore";
import { Role } from "@react-client/types/roles";

export const useRoles = () => {
	const { roles, hasRole } = useUserStore();

	return {
		roles,
		hasRole,
		isAdmin: hasRole(Role.ADMIN_IT) || hasRole(Role.ADMIN_IT_LEAD),
		isDs: hasRole(Role.DS),
		isDe: hasRole(Role.DE),
		isDeLead: hasRole(Role.DE_LEAD),
		isModelOps: hasRole(Role.MODEL_OPS),
		isModelOpsLead: hasRole(Role.MODEL_OPS_LEAD),
		isMIPM: hasRole(Role.MIPM),
		isDsLead: hasRole(Role.DS_LEAD),
		isBICCustomerBroker: hasRole(Role.BI_CUSTOMER_BROKER),
		isValidatorLead: hasRole(Role.VALIDATOR_LEAD),
		isValidator: hasRole(Role.VALIDATOR),
		isBusinessCustomer: hasRole(Role.BUSINESS_CUSTOMER),
	};
};
