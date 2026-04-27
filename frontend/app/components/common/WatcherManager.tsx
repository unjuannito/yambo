import React, { useState, useRef, useEffect } from "react";
import type { IssueWatcher, DropWatcher } from "~/types/issueType";
import { adminUserService } from "~/services/adminUserService";
import type { User } from "~/types/userType";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { getErrorMessage } from "~/types/error";

type Watcher = IssueWatcher | DropWatcher;

interface WatcherManagerProps {
    watchers: Watcher[];
    onAdd: (email: string, userId?: string) => Promise<void>;
    onRemove: (email: string) => Promise<void>;
    loading?: boolean;
}

export function WatcherManager({ watchers, onAdd, onRemove, loading = false }: WatcherManagerProps) {
    const [query, setQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userSuggestions, setUserSuggestions] = useState<User[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [removeLoading, setRemoveLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suggestionsRef = useRef<HTMLDivElement | null>(null);

    const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
    const selectedUserLabel = selectedUser ? `${selectedUser.name} · ${selectedUser.email}` : "";
    const normalizedWatchers = watchers.map((watcher) => watcher.email.toLowerCase());

    const mergeUsers = (users: User[][]) => {
        const seen = new Set<string>();
        return users.flat().filter((user) => {
            const normalizedEmail = user.email.trim().toLowerCase();
            if (seen.has(normalizedEmail)) {
                return false;
            }
            seen.add(normalizedEmail);
            return true;
        });
    };

    useEffect(() => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery || trimmedQuery.length < 2 || trimmedQuery === selectedUserLabel) {
            setUserSuggestions([]);
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setSuggestionsLoading(true);
            try {
                const [byName, byEmail] = await Promise.all([
                    adminUserService.listUsers({ name: trimmedQuery, size: 8 }),
                    adminUserService.listUsers({ email: trimmedQuery, size: 8 }),
                ]);
                setUserSuggestions(mergeUsers([byName.content, byEmail.content]));
            } catch {
                setUserSuggestions([]);
            } finally {
                setSuggestionsLoading(false);
            }
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, selectedUserLabel]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setUserSuggestions([]);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        setQuery(`${user.name} · ${user.email}`);
        setUserSuggestions([]);
    };

    const handleClearUser = () => {
        setSelectedUser(null);
        setQuery("");
    };

    const handleAdd = async () => {
        setError(null);
        const selectedEmail = selectedUser ? selectedUser.email : query;
        const trimmed = selectedEmail.trim().toLowerCase();
        if (!isValidEmail(trimmed)) {
            setError("Introduce un email válido");
            return;
        }
        if (normalizedWatchers.includes(trimmed)) {
            setError("Este email ya está en la lista de seguidores");
            return;
        }
        setAddLoading(true);
        try {
            await onAdd(trimmed, selectedUser?.id);
            setQuery("");
            setSelectedUser(null);
        } catch (err) {
            setError(getErrorMessage(err, "Error al añadir seguidor"));
        } finally {
            setAddLoading(false);
        }
    };

    const handleRemove = async (watcherEmail: string) => {
        setRemoveLoading(watcherEmail);
        try {
            await onRemove(watcherEmail);
        } catch (err) {
            setError(getErrorMessage(err, "Error al eliminar seguidor"));
        } finally {
            setRemoveLoading(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Current watchers */}
            {loading ? (
                <p className="text-sm text-gray-400">Cargando seguidores...</p>
            ) : watchers.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Sin seguidores aún</p>
            ) : (
                <ul className="space-y-2">
                    {watchers.map((w) => (
                        <li
                            key={w.id}
                            className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="h-7 w-7 rounded-full bg-gradient-to-br from-yambo-green-400 to-yambo-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                    {(w.userName || w.email).charAt(0).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    {w.userName && (
                                        <p className="text-sm font-semibold text-yambo-black truncate">{w.userName}</p>
                                    )}
                                    <p className="text-xs text-gray-400 truncate">{w.email}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemove(w.email)}
                                disabled={removeLoading === w.email}
                                className="text-gray-300 hover:text-red-500 transition-colors shrink-0 text-lg leading-none"
                                aria-label={`Eliminar seguidor ${w.email}`}
                            >
                                {removeLoading === w.email ? "…" : "×"}
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {/* Add watcher form */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Añadir seguidor</p>

                <div className="relative" ref={suggestionsRef}>
                    <input
                        type="text"
                        placeholder="Buscar usuario o escribir email..."
                        value={query}
                        onChange={(e) => {
                            const nextValue = e.target.value;
                            setQuery(nextValue);
                            setError(null);
                            if (selectedUser && nextValue !== selectedUserLabel) {
                                setSelectedUser(null);
                            }
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yambo-green-300"
                    />
                    {selectedUser && (
                        <button
                            type="button"
                            onClick={handleClearUser}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 text-lg"
                            aria-label="Quitar usuario seleccionado"
                        >
                            ×
                        </button>
                    )}
                    {(userSuggestions.length > 0 || suggestionsLoading) && (
                        <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden">
                            {suggestionsLoading ? (
                                <p className="px-3 py-2 text-sm text-gray-400">Buscando...</p>
                            ) : (
                                userSuggestions.map((user) => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => handleSelectUser(user)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-yambo-green-50 transition-colors"
                                    >
                                        <span className="h-6 w-6 rounded-full bg-gradient-to-br from-yambo-green-400 to-yambo-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                        <span className="font-medium truncate">{user.name}</span>
                                        <span className="text-gray-400 truncate text-xs">{user.email}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {query.trim() && !selectedUser && isValidEmail(query) && !normalizedWatchers.includes(query.trim().toLowerCase()) && (
                    <p className="text-xs text-gray-500">
                        Se añadirá como seguidor por email: <span className="font-semibold text-yambo-black">{query.trim().toLowerCase()}</span>
                    </p>
                )}

                {error && <p className="text-xs text-red-500">{error}</p>}

                <ButtonComponent
                    onClick={handleAdd}
                    isLoading={addLoading}
                    disabled={addLoading || !query.trim()}
                    variant="primary"
                    size="sm"
                    className="w-full"
                >
                    {selectedUser ? "Añadir usuario" : "Añadir seguidor"}
                </ButtonComponent>
            </div>
        </div>
    );
}
