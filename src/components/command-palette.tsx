import { Dialog as DialogPrimitive } from "radix-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "#/lib/utils";

export interface CommandItem {
	id: string;
	label: string;
	hint?: string;
	group?: string;
	keywords?: string[];
	shortcut?: string[];
	onSelect: () => void;
}

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: CommandItem[];
	placeholder?: string;
}

export function CommandPalette({
	open,
	onOpenChange,
	items,
	placeholder = "Type a command or search...",
}: Props) {
	const [query, setQuery] = useState("");
	const [activeIdx, setActiveIdx] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return items;
		return items.filter((item) => {
			const hay = [item.label, item.hint, item.group, ...(item.keywords ?? [])]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return hay.includes(q);
		});
	}, [items, query]);

	useEffect(() => {
		if (!open) {
			setQuery("");
			setActiveIdx(0);
		}
	}, [open]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset index when filtered list changes
	useEffect(() => {
		setActiveIdx(0);
	}, [query]);

	useEffect(() => {
		if (!open) return;
		const el = listRef.current?.querySelector<HTMLButtonElement>(
			`[data-idx="${activeIdx}"]`,
		);
		el?.scrollIntoView({ block: "nearest" });
	}, [activeIdx, open]);

	const run = (item: CommandItem) => {
		onOpenChange(false);
		queueMicrotask(() => item.onSelect());
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIdx((i) => (i + 1) % Math.max(filtered.length, 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIdx(
				(i) =>
					(i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1),
			);
		} else if (e.key === "Enter") {
			e.preventDefault();
			const item = filtered[activeIdx];
			if (item) run(item);
		}
	};

	const grouped = useMemo(() => {
		const map = new Map<string, { item: CommandItem; idx: number }[]>();
		filtered.forEach((item, idx) => {
			const key = item.group ?? "Actions";
			const entry = map.get(key);
			if (entry) {
				entry.push({ item, idx });
			} else {
				map.set(key, [{ item, idx }]);
			}
		});
		return [...map.entries()];
	}, [filtered]);

	return (
		<DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
				<DialogPrimitive.Content
					onOpenAutoFocus={(e) => {
						e.preventDefault();
						inputRef.current?.focus();
					}}
					className="fixed left-1/2 top-[20%] z-50 w-[min(92vw,560px)] -translate-x-1/2 overflow-hidden rounded-none border bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/5 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0"
				>
					<DialogPrimitive.Title className="sr-only">
						Command palette
					</DialogPrimitive.Title>
					<DialogPrimitive.Description className="sr-only">
						Navigate and run actions
					</DialogPrimitive.Description>
					<div className="flex items-center gap-2 border-b px-4">
						<svg
							aria-hidden="true"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="text-muted-foreground"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="m21 21-4.3-4.3" />
						</svg>
						<input
							ref={inputRef}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={placeholder}
							className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
						/>
					</div>
					<div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
						{filtered.length === 0 ? (
							<div className="px-4 py-6 text-center text-sm text-muted-foreground">
								No results.
							</div>
						) : (
							grouped.map(([group, entries]) => (
								<div key={group} className="mb-1 last:mb-0">
									<div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
										{group}
									</div>
									{entries.map(({ item, idx }) => (
										<button
											key={item.id}
											type="button"
											data-idx={idx}
											onMouseEnter={() => setActiveIdx(idx)}
											onClick={() => run(item)}
											className={cn(
												"flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors",
												idx === activeIdx
													? "bg-accent text-accent-foreground"
													: "text-foreground",
											)}
										>
											<span className="flex min-w-0 flex-col">
												<span className="truncate">{item.label}</span>
												{item.hint && (
													<span className="truncate text-xs text-muted-foreground">
														{item.hint}
													</span>
												)}
											</span>
											{item.shortcut && (
												<span className="flex gap-1 text-[10px] text-muted-foreground">
													{item.shortcut.map((k) => (
														<kbd
															key={k}
															className="rounded border bg-muted px-1.5 py-0.5 font-mono"
														>
															{k}
														</kbd>
													))}
												</span>
											)}
										</button>
									))}
								</div>
							))
						)}
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

interface HelpProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	shortcuts: { keys: string[]; description: string }[];
}

export function KeyboardHelp({ open, onOpenChange, shortcuts }: HelpProps) {
	return (
		<DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
				<DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-none border bg-popover p-5 text-popover-foreground shadow-2xl ring-1 ring-foreground/5 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0">
					<DialogPrimitive.Title className="font-display text-lg font-semibold">
						Keyboard shortcuts
					</DialogPrimitive.Title>
					<DialogPrimitive.Description className="mt-1 text-xs text-muted-foreground">
						Move around faster.
					</DialogPrimitive.Description>
					<ul className="mt-4 space-y-2">
						{shortcuts.map((s) => (
							<li
								key={s.description}
								className="flex items-center justify-between gap-4 text-sm"
							>
								<span className="text-muted-foreground">{s.description}</span>
								<span className="flex gap-1">
									{s.keys.map((k) => (
										<kbd
											key={k}
											className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px]"
										>
											{k}
										</kbd>
									))}
								</span>
							</li>
						))}
					</ul>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
