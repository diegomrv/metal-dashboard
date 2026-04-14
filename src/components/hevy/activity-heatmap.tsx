import { useCallback, useMemo, useRef, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { currentStreak, dailyActivity } from "#/lib/hevy/metrics";
import type { Workout } from "#/lib/hevy/types";

interface Props {
	workouts: Workout[];
	bare?: boolean;
}

const CELL_SIZE = 13;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const LABEL_WIDTH = 32;
const HEADER_HEIGHT = 20;

interface Cell {
	date: string;
	count: number;
	week: number;
	day: number;
}

function cellColor(count: number): string {
	if (count === 0) return "var(--muted)";
	if (count === 1) return "var(--chart-1)";
	if (count === 2) return "var(--chart-2)";
	if (count === 3) return "var(--chart-4)";
	return "var(--chart-5)";
}

function parseLocalDate(dateStr: string): Date {
	return new Date(`${dateStr}T12:00:00`);
}

function formatDate(dateStr: string): string {
	return parseLocalDate(dateStr).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function hitTest(
	e: React.MouseEvent<SVGSVGElement>,
	cellMap: Map<string, Cell>,
): { cell: Cell; rectX: number; rectY: number } | null {
	const svg = e.currentTarget;
	const pt = svg.createSVGPoint();
	pt.x = e.clientX;
	pt.y = e.clientY;
	const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
	const col = Math.floor((svgPt.x - LABEL_WIDTH) / CELL_STEP);
	const row = Math.floor((svgPt.y - HEADER_HEIGHT) / CELL_STEP);
	if (col < 0 || row < 0 || row > 6) return null;
	const localX = svgPt.x - LABEL_WIDTH - col * CELL_STEP;
	const localY = svgPt.y - HEADER_HEIGHT - row * CELL_STEP;
	if (localX > CELL_SIZE || localY > CELL_SIZE) return null;
	const cell = cellMap.get(`${col},${row}`);
	if (!cell) return null;
	return {
		cell,
		rectX: LABEL_WIDTH + col * CELL_STEP,
		rectY: HEADER_HEIGHT + row * CELL_STEP,
	};
}

export function ActivityHeatmap({ workouts, bare = false }: Props) {
	const streak = useMemo(() => currentStreak(workouts), [workouts]);
	const [hovered, setHovered] = useState<{
		date: string;
		count: number;
		x: number;
		y: number;
	} | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const { cells, cellMap, numWeeks, monthLabels } = useMemo(() => {
		const days = dailyActivity(workouts, 365);
		const cells: Cell[] = [];

		if (days.length === 0) {
			return {
				cells: [],
				cellMap: new Map<string, Cell>(),
				numWeeks: 0,
				monthLabels: [],
			};
		}

		const firstDate = parseLocalDate(days[0].date);
		const firstDow = firstDate.getDay();
		const firstRow = firstDow === 0 ? 6 : firstDow - 1;

		let week = 0;
		let currentRow = firstRow;

		for (const { date, count } of days) {
			cells.push({ date, count, week, day: currentRow });
			currentRow++;
			if (currentRow > 6) {
				currentRow = 0;
				week++;
			}
		}

		const numWeeks = week + 1;
		const cellMap = new Map(cells.map((c) => [`${c.week},${c.day}`, c]));

		const monthLabels: { label: string; x: number }[] = [];
		let lastMonth = -1;
		for (const cell of cells) {
			const month = Number.parseInt(cell.date.slice(5, 7), 10) - 1;
			if (month !== lastMonth) {
				const x = LABEL_WIDTH + cell.week * CELL_STEP;
				if (
					monthLabels.length === 0 ||
					x - monthLabels[monthLabels.length - 1].x >= CELL_STEP * 3
				) {
					monthLabels.push({
						label: parseLocalDate(cell.date).toLocaleDateString("en-US", {
							month: "short",
						}),
						x,
					});
				}
				lastMonth = month;
			}
		}

		return { cells, cellMap, numWeeks, monthLabels };
	}, [workouts]);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<SVGSVGElement>) => {
			const hit = hitTest(e, cellMap);
			if (!hit) {
				setHovered(null);
				return;
			}
			const container = containerRef.current?.getBoundingClientRect();
			const svg = e.currentTarget.getBoundingClientRect();
			if (!container) return;
			setHovered({
				date: hit.cell.date,
				count: hit.cell.count,
				x: svg.left - container.left + hit.rectX + CELL_SIZE / 2,
				y: svg.top - container.top + hit.rectY,
			});
		},
		[cellMap],
	);

	const handleMouseLeave = useCallback(() => setHovered(null), []);

	const svgWidth = LABEL_WIDTH + numWeeks * CELL_STEP;
	const svgHeight = HEADER_HEIGHT + 7 * CELL_STEP;

	const heatmapBody = (
		<div ref={containerRef} className="relative">
			<div className="overflow-x-auto">
				<svg
					width={svgWidth}
					height={svgHeight}
					className="block"
					role="img"
					aria-label="Workout activity heatmap for the last year"
					onMouseMove={handleMouseMove}
					onMouseLeave={handleMouseLeave}
				>
					{monthLabels.map((m) => (
						<text
							key={`${m.label}-${m.x}`}
							x={m.x}
							y={12}
							className="fill-muted-foreground text-[11px]"
						>
							{m.label}
						</text>
					))}
					{[
						{ label: "Mon", row: 0 },
						{ label: "Wed", row: 2 },
						{ label: "Fri", row: 4 },
					].map((d) => (
						<text
							key={d.label}
							x={0}
							y={HEADER_HEIGHT + d.row * CELL_STEP + CELL_SIZE - 1}
							className="fill-muted-foreground text-[11px]"
						>
							{d.label}
						</text>
					))}
					{cells.map((cell) => (
						<rect
							key={cell.date}
							x={LABEL_WIDTH + cell.week * CELL_STEP}
							y={HEADER_HEIGHT + cell.day * CELL_STEP}
							width={CELL_SIZE}
							height={CELL_SIZE}
							rx={2}
							fill={cellColor(cell.count)}
						/>
					))}
				</svg>
			</div>
			{hovered && (
				<div
					className="pointer-events-none absolute z-50 -translate-x-1/2 rounded-md bg-foreground px-3 py-1.5 text-xs text-background"
					style={{
						left: hovered.x,
						top: hovered.y - 36,
					}}
				>
					{formatDate(hovered.date)}:{" "}
					{hovered.count === 0
						? "No workouts"
						: `${hovered.count} workout${hovered.count !== 1 ? "s" : ""}`}
				</div>
			)}
		</div>
	);

	if (bare) {
		return (
			<section
				className="rise-in flex flex-col gap-3 border bg-card px-4 py-3 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:gap-6"
				style={{ animationDelay: "100ms" }}
			>
				<div className="flex items-baseline gap-2 shrink-0">
					<span className="font-display text-2xl font-bold tabular-nums">
						{streak}
					</span>
					<span className="text-xs text-muted-foreground">
						week streak · last 12 months
					</span>
				</div>
				<div className="min-w-0 flex-1">{heatmapBody}</div>
			</section>
		);
	}

	return (
		<Card className="rise-in" style={{ animationDelay: "100ms" }}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Activity</CardTitle>
						<CardDescription>
							Training activity over the last year
						</CardDescription>
					</div>
					<div className="text-right">
						<p className="text-2xl font-bold tabular-nums">{streak} wk</p>
						<p className="text-xs text-muted-foreground">streak</p>
					</div>
				</div>
			</CardHeader>
			<CardContent>{heatmapBody}</CardContent>
		</Card>
	);
}
