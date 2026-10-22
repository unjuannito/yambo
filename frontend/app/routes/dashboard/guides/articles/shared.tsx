export interface Callout {
    n: number;
    desc: string;
    xPct: number;
    yPct: number;
}

export function AnnotatedFigure({ src, alt, width, height, callouts, maxWidth, frame = "browser" }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    callouts: Callout[];
    maxWidth?: number;
    frame?: "browser" | "phone";
}) {
    const isPhone = frame === "phone";
    return (
        <figure className={`my-5 flex flex-col ${isPhone ? "sm:flex-row sm:items-start" : "lg:flex-row lg:items-start"} gap-6`}>
            <div
                className={`relative overflow-hidden ${
                    isPhone
                        ? "mx-auto sm:mx-0 sm:shrink-0 rounded-[2.25rem] ring-[6px] ring-gray-900/90 shadow-xl"
                        : "w-full lg:w-[62%] lg:shrink-0 rounded-2xl border border-gray-200 shadow-sm"
                }`}
                style={maxWidth ? { maxWidth } : undefined}
            >
                {isPhone && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 z-10 h-5 w-24 rounded-b-2xl bg-gray-900/90" />
                )}
                <img src={src} alt={alt} width={width} height={height} className="w-full h-auto !m-0" />
                {callouts.map((c) => (
                    <span
                        key={c.n}
                        className="absolute w-6 h-6 rounded-full bg-yambo-green-600 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white shadow-md"
                        style={{ left: `${c.xPct}%`, top: `${c.yPct}%`, transform: "translate(-50%, -50%)" }}
                        aria-hidden="true"
                    >
                        {c.n}
                    </span>
                ))}
            </div>
            <figcaption className={isPhone ? "sm:flex-1" : "lg:flex-1"}>
                <ol className={`mt-3 space-y-1.5 ${isPhone ? "sm:mt-0" : "lg:mt-0"}`}>
                    {callouts.map((c) => (
                        <li key={c.n} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-yambo-green-600 text-white text-xs font-bold flex items-center justify-center">{c.n}</span>
                            <span>{c.desc}</span>
                        </li>
                    ))}
                </ol>
            </figcaption>
        </figure>
    );
}
