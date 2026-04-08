import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "#/components/ui/chart";
import { weeklyVolume } from "#/lib/hevy/metrics";
import type { Workout } from "#/lib/hevy/types";

interface Props {
	workouts: Workout[];
}

const chartConfig = {
	volume: {
		label: "Volume (kg)",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

function formatVolume(value: number): string {
	if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
	return value.toLocaleString();
}

export function VolumeChart({ workouts }: Props) {
	const data = weeklyVolume(workouts, 12);

	return (
		<Card className="rise-in" style={{ animationDelay: "180ms" }}>
			<CardHeader>
				<CardTitle>Volume Over Time</CardTitle>
				<CardDescription>
					Total weekly volume in kg (weight x reps) over the last 12 weeks
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="h-72 w-full">
					<AreaChart data={data} accessibilityLayer>
						<defs>
							<linearGradient id="fillVolume" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-volume)"
									stopOpacity={0.3}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-volume)"
									stopOpacity={0.05}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="label"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							interval="preserveStartEnd"
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							width={48}
							tickFormatter={formatVolume}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									formatter={(value) => `${Number(value).toLocaleString()} kg`}
								/>
							}
						/>
						<Area
							dataKey="volume"
							type="monotone"
							fill="url(#fillVolume)"
							stroke="var(--color-volume)"
							strokeWidth={2}
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
