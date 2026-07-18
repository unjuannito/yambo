import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { fireConfetti } from "~/utils/confetti";
import SectionWrapper from "~/components/home/SectionWrapper";

interface AboutBullet {
    icon: string;
    title: string;
    description: string;
    link: string;
}

interface AboutUsProps {
    title?: string;
    intro?: string;
    bulletsJson?: string;
    image?: string;
    sectionIndex: number;
}

function getDefaultBullets(t: (key: string) => string): AboutBullet[] {
    return [
        { icon: "✎", title: t("about.bullet1Title"), description: t("about.bullet1Desc"), link: "/formacion" },
        { icon: "✦", title: t("about.bullet2Title"), description: t("about.bullet2Desc"), link: "/voluntariado" },
        { icon: "★", title: t("about.bullet3Title"), description: t("about.bullet3Desc"), link: "/eventos" },
        { icon: "✿", title: t("about.bullet4Title"), description: t("about.bullet4Desc"), link: "/apoyo" },
    ];
}

const DEFAULT_IMAGE = "/gallery-preview.jpg";

function parseBullets(json: string | undefined, t: (key: string) => string): AboutBullet[] {
    if (!json) return getDefaultBullets(t);
    try {
        return JSON.parse(json) as AboutBullet[];
    } catch {
        return getDefaultBullets(t);
    }
}

export default function AboutUs({ title, intro, bulletsJson, image, sectionIndex }: AboutUsProps) {
    const { t } = useTranslation();
    const bullets = parseBullets(bulletsJson, t);
    const [rainbowActive, setRainbowActive] = useState(false);
    const [bouncingIcons, setBouncingIcons] = useState<Set<number>>(new Set());
    const [secretText, setSecretText] = useState(false);
    const clickSequenceRef = useRef<number[]>([]);
    const sequenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleBulletClick(idx: number) {
        setBouncingIcons((prev) => new Set([...prev, idx]));
        setTimeout(() => {
            setBouncingIcons((prev) => {
                const next = new Set(prev);
                next.delete(idx);
                return next;
            });
        }, 500);

        clickSequenceRef.current.push(idx);
        if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
        sequenceTimerRef.current = setTimeout(() => {
            clickSequenceRef.current = [];
        }, 5000);

        const seq = clickSequenceRef.current;
        if (
            seq.length >= 4 &&
            seq[seq.length - 4] === 0 &&
            seq[seq.length - 3] === 1 &&
            seq[seq.length - 2] === 2 &&
            seq[seq.length - 1] === 3
        ) {
            clickSequenceRef.current = [];
            setRainbowActive(true);
            setSecretText(true);
            fireConfetti();
            setTimeout(() => {
                setRainbowActive(false);
                setSecretText(false);
            }, 3000);
        }
    }

    return (
        <SectionWrapper
            sectionIndex={sectionIndex}
            className={rainbowActive ? "ee-rainbow" : ""}
            title={title}
            blobs={[{ color: "purple", position: "-top-20 -right-32", opacity: "opacity-50" }]}
        >
            <>            
                {intro && (
                    <p className="mb-8 text-lg text-gray-600 leading-relaxed ml-8 sm:max-w-lg">
                        {intro || t("about.intro")}
                    </p>
                )}
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <ul className="space-y-5 stagger">
                            {bullets.map((item, idx) => (
                                <li
                                    key={item.title || idx}
                                    className="flex items-start gap-4 group fade-up bg-gradient-to-r from-yambo-green-50/50 to-transparent p-3 rounded-2xl hover:from-yambo-green-50 transition-all duration-300"
                                >
                                    <div
                                        className={`text-2xl w-10 h-10 flex items-center justify-center cursor-pointer select-none bg-white rounded-2xl shadow-sm transition-transform ${bouncingIcons.has(idx) ? "ee-bounce-scale" : "group-hover:scale-110"}`}
                                        onClick={() => handleBulletClick(idx)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBulletClick(idx); } }}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        {item.icon}
                                    </div>
                                    <div>
                                        <strong className="block text-lg font-semibold text-yambo-black">
                                            {item.title}
                                        </strong>
                                        <p className="text-sm text-gray-500">{item.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        {secretText && (
                            <p className="text-sm text-yambo-purple-600 font-semibold mt-4 ee-slide-down">
                                {t("about.secretText")}
                            </p>
                        )}
                        <a
                            href="/proyectos"
                            className="inline-flex items-center gap-1 text-yambo-green-600 text-sm font-semibold hover:text-yambo-green-700 mt-4 transition-colors"
                        >
                            {t("common.showMore")} →
                        </a>
                    </div>

                    <div className="relative group fade-up" style={{ animationDelay: "0.2s" }}>
                        <div className="absolute -inset-3 bg-gradient-to-br from-yambo-green-200 to-yambo-purple-200 rounded-3xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
                        <img
                            src={image || DEFAULT_IMAGE}
                            alt={title || t("public.aboutSection")}
                            className="relative rounded-3xl shadow-xl object-cover w-full h-full"
                        />
                    </div>
                </div>
            </>
        </SectionWrapper>
    );
}
