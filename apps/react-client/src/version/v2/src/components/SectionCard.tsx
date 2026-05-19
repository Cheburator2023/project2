import { Card, CardHeader, CardContent, Chip } from "@mui/material";
type Props = { title: string; status?: string; children: React.ReactNode };
export const SectionCard = ({ title, status, children }: Props) => (
	<Card sx={{ mb: 2 }}>
		<CardHeader
			title={title}
			action={status ? <Chip size="small" label={status} /> : null}
		/>
		<CardContent>{children}</CardContent>
	</Card>
);
