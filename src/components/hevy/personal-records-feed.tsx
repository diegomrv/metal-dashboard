import { Badge } from "#/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { useRecentPRs } from "#/lib/hevy/use-hevy-data";

interface Props {
	userId: string;
}

function timeAgo(dateString: string): string {
	const seconds = Math.round(
		(Date.now() - new Date(dateString).getTime()) / 1000,
	);
	const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

	if (seconds < 60) return rtf.format(-seconds, "second");
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return rtf.format(-minutes, "minute");
	const hours = Math.round(minutes / 60);
	if (hours < 24) return rtf.format(-hours, "hour");
	const days = Math.round(hours / 24);
	if (days < 30) return rtf.format(-days, "day");
	const months = Math.round(days / 30);
	if (months < 12) return rtf.format(-months, "month");
	return rtf.format(-Math.round(days / 365), "year");
}

export function PersonalRecordsFeed({ userId }: Props) {
	const { data: prs, isLoading } = useRecentPRs(userId);

	if (isLoading) return null;

	if (!prs || prs.length === 0) {
		return (
			<Card className="rise-in" style={{ animationDelay: "150ms" }}>
				<CardHeader>
					<CardTitle>Personal Records</CardTitle>
					<CardDescription>
						Your most recent record-breaking lifts
					</CardDescription>
				</CardHeader>
				<CardContent className="flex h-32 items-center justify-center text-sm text-muted-foreground">
					No personal records yet. Sync your data to get started.
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="rise-in" style={{ animationDelay: "150ms" }}>
			<CardHeader>
				<CardTitle>Personal Records</CardTitle>
				<CardDescription>
					Your most recent record-breaking lifts
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="divide-y divide-border">
					{prs.map((pr) => (
						<div
							key={pr.id}
							className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4"
						>
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium">{pr.exerciseTitle}</p>
								<p className="text-xs text-muted-foreground">
									{timeAgo(pr.achievedAt)}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="secondary">
									{pr.type === "e1rm" ? "1RM" : "Volume"}
								</Badge>
								<Badge variant="outline">
									{pr.weightKg}kg x {pr.reps}
								</Badge>
								<span className="text-sm text-muted-foreground">
									{pr.type === "e1rm"
										? `Est. 1RM: ${Math.round(pr.value * 10) / 10}kg`
										: `Volume: ${Math.round(pr.value * 10) / 10}kg`}
								</span>
								{pr.previousValue != null ? (
									<span className="text-sm font-medium text-green-600 dark:text-green-400">
										+{Math.round((pr.value - pr.previousValue) * 10) / 10}
										kg
									</span>
								) : (
									<Badge variant="default">First!</Badge>
								)}
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
