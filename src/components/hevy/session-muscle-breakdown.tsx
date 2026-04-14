import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import type { SessionMuscleEntry } from "#/lib/hevy/metrics";
import { muscleColor } from "#/lib/hevy/muscle-colors";

interface Props {
	entries: SessionMuscleEntry[];
}

export function SessionMuscleBreakdown({ entries }: Props) {
	if (entries.length === 0) return null;
	const max = entries[0]?.sets ?? 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-lg">Muscles worked</CardTitle>
				<CardDescription>Share of working sets in this session</CardDescription>
			</CardHeader>
			<CardContent>
				<ul className="flex flex-col gap-2 text-sm">
					{entries.map((e) => {
						const pct = max > 0 ? (e.sets / max) * 100 : 0;
						return (
							<li key={e.muscle} className="flex items-center gap-3">
								<span className="w-20 shrink-0 truncate text-muted-foreground">
									{e.label}
								</span>
								<div className="relative h-2 flex-1 overflow-hidden rounded-sm bg-muted">
									<div
										className="absolute inset-y-0 left-0"
										style={{
											width: `${pct}%`,
											backgroundColor: muscleColor(e.muscle),
										}}
									/>
								</div>
								<span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
									{e.sets}
								</span>
							</li>
						);
					})}
				</ul>
			</CardContent>
		</Card>
	);
}
