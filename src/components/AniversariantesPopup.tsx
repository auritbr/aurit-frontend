import { useEffect, useMemo, useState } from "react";
import { Cake, Gift, PartyPopper, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getIntegrantes } from "@/data/integrantes";
import { getParticipantes } from "@/data/participantes";
import { cargoDiretoriaLabel, getDiretorias } from "@/lib/diretoriaStore";

interface Aniversariante {
    id: string;
    nome: string;
    dataNascimento?: string;
    categoria?: string;
    fotoUrl?: string;
    cpf?: string;
}

// Aceita "dd/mm/aaaa" ou "aaaa-mm-dd".
function parseDayMonth(v?: string): { d: number; m: number } | null {
    if (!v) return null;
    const s = v.trim();
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
    if (br) return { d: +br[1], m: +br[2] };
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return { d: +iso[3], m: +iso[2] };
    return null;
}

function iniciais(nome: string) {
    return nome
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("");
}

function todayLocalKey() {
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const dd = String(hoje.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
}

async function coletarAniversariantes(): Promise<Aniversariante[]> {
    const hoje = new Date();
    const dHoje = hoje.getDate();
    const mHoje = hoje.getMonth() + 1;

    const [participantesResult, integrantesResult, diretoriasResult] =
        await Promise.allSettled([
            getParticipantes(),
            getIntegrantes(),
            getDiretorias(),
        ]);

    const participantes =
        participantesResult.status === "fulfilled" ? participantesResult.value : [];
    const integrantes =
        integrantesResult.status === "fulfilled" ? integrantesResult.value : [];
    const diretorias =
        diretoriasResult.status === "fulfilled" ? diretoriasResult.value : [];

    const brutos: Aniversariante[] = [
        ...participantes.map((p) => ({
            id: `part-${p.id}`,
            nome: p.nomeCompleto,
            dataNascimento: p.dataNascimento,
            categoria: "Participante",
            cpf: p.cpf,
        })),
        ...integrantes.map((i) => ({
            id: `int-${i.id}`,
            nome:
                i.tipoPessoaIntegrante === "PESSOA_JURIDICA"
                    ? i.nomeSocial || i.nomeFantasia || "Integrante"
                    : i.nomeCompleto,
            dataNascimento: i.dataNascimento,
            categoria: i.funcaoIntegrante || "Integrante",
            cpf: i.cpf || i.cnpj,
        })),
        ...diretorias.map((d) => ({
            id: `dir-${d.id}`,
            nome: d.nomeCompleto,
            dataNascimento: d.dataNascimento,
            categoria: cargoDiretoriaLabel(d.cargoDiretoria) || "Diretoria",
            cpf: d.cpf,
        })),
    ];

    const filtrados = brutos.filter((a) => {
        const dm = parseDayMonth(a.dataNascimento);
        return dm && dm.d === dHoje && dm.m === mHoje;
    });

    // dedup por cpf/nome
    const map = new Map<string, Aniversariante>();
    for (const a of filtrados) {
        const key = (a.cpf?.replace(/\D/g, "") || a.nome.trim().toLowerCase());
        if (!map.has(key)) map.set(key, a);
    }
    return Array.from(map.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR"),
    );
}

const SESSION_KEY = "aniversariantes-popup-visto";

export function AniversariantesPopup() {
    const [open, setOpen] = useState(false);
    const [lista, setLista] = useState<Aniversariante[]>([]);

    useEffect(() => {
        let mounted = true;
        const hojeKey = todayLocalKey();

        if (sessionStorage.getItem(SESSION_KEY) === hojeKey) return;

        void coletarAniversariantes().then((items) => {
            if (!mounted || items.length === 0) return;

            setLista(items);
            setOpen(true);
            sessionStorage.setItem(SESSION_KEY, hojeKey);
        });

        return () => {
            mounted = false;
        };
    }, []);

    const isSingular = lista.length === 1;
    const subtitulo = useMemo(
        () =>
            isSingular
                ? "Com alegria, lembramos o aniversariante de hoje."
                : "Com alegria, lembramos os aniversariantes de hoje.",
        [isSingular],
    );

    if (lista.length === 0) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent
                className="p-0 overflow-hidden border-0 shadow-2xl rounded-2xl max-w-[95vw] sm:max-w-[520px] gap-0 [&>button.absolute]:hidden"
                aria-describedby={undefined}
            >
                {/* Cabeçalho comemorativo */}
                <div className="relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/70 text-primary-foreground px-6 pt-7 pb-8 text-center">
                    <div className="pointer-events-none absolute inset-0 opacity-20">
                        <Sparkles className="absolute top-3 left-4 h-5 w-5" />
                        <Sparkles className="absolute top-6 right-8 h-3 w-3" />
                        <PartyPopper className="absolute bottom-3 left-8 h-4 w-4" />
                        <Gift className="absolute bottom-5 right-5 h-4 w-4" />
                    </div>

                    <DialogClose
                        aria-label="Fechar popup de aniversariantes"
                        className="absolute right-3 top-3 rounded-full p-1.5 text-primary-foreground/80 hover:bg-white/15 hover:text-primary-foreground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                        <X className="h-4 w-4" />
                    </DialogClose>

                    <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm ring-4 ring-white/10">
                        <Cake className="h-7 w-7" />
                    </div>
                    <h2 className="relative text-xl sm:text-2xl font-semibold tracking-tight">
                        Hoje é dia de celebrar!
                    </h2>
                    <p className="relative mt-1 text-sm text-primary-foreground/85">
                        {subtitulo}
                    </p>
                </div>

                {/* Lista */}
                <div className="bg-background px-5 sm:px-6 pt-5 pb-4">
                    <ScrollArea className={lista.length > 4 ? "h-[280px] pr-3" : ""}>
                        <ul className="space-y-2">
                            {lista.map((a) => (
                                <li
                                    key={a.id}
                                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 hover:bg-accent/40 transition-colors"
                                >
                                    <Avatar className="h-11 w-11 ring-2 ring-primary/15">
                                        {a.fotoUrl ? <AvatarImage src={a.fotoUrl} alt={a.nome} /> : null}
                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                            {iniciais(a.nome) || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-foreground">
                                            {a.nome}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                            {a.categoria && <span className="truncate">{a.categoria}</span>}
                                            {a.categoria && a.dataNascimento && <span aria-hidden>•</span>}
                                            {a.dataNascimento && <span>{a.dataNascimento}</span>}
                                        </div>
                                    </div>
                                    <Gift className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>

                    <p className="mt-4 text-center text-sm text-muted-foreground leading-relaxed">
                        Desejamos muita saúde, alegria e novos caminhos de realização.
                    </p>

                    <div className="mt-4 flex justify-center">
                        <Button onClick={() => setOpen(false)} className="min-w-[140px] rounded-full">
                            Fechar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default AniversariantesPopup;
