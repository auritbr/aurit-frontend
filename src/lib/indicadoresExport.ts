import * as XLSX from "xlsx";

type ExportItem = {
  label: string;
  count: number;
  percentual: number;
};

type ExportSection = {
  title: string;
  itens: ExportItem[];
};

type ExportData = {
  filtros: {
    ano: string;
    atividade: string;
    turma: string;
    status: string;
    genero?: string;
    racaCor?: string;
    faixaRenda?: string;
    cadunico?: string;
    tipoDeficiencia?: string;
    tipoNeurodivergencia?: string;
    bolsaFamilia?: string;
  };
  total: number;
  indicadores: ExportSection[];
};

function baixarArquivo(conteudo: BlobPart, nome: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function exportToCSV(data: ExportData) {
  const linhas: string[][] = [];

  linhas.push(["Relatório", "Indicadores Sociodemográficos"]);
  linhas.push(["Ano", data.filtros.ano]);
  linhas.push(["Atividade", data.filtros.atividade]);
  linhas.push(["Turma", data.filtros.turma]);
  linhas.push(["Status da matrícula", data.filtros.status]);
  linhas.push(["Gênero", data.filtros.genero ?? "Todos"]);
  linhas.push(["Raça/cor", data.filtros.racaCor ?? "Todas"]);
  linhas.push(["Faixa de renda", data.filtros.faixaRenda ?? "Todas"]);
  linhas.push(["CadÚnico", data.filtros.cadunico ?? "Todos"]);
  linhas.push(["Tipo de deficiência", data.filtros.tipoDeficiencia ?? "Todas"]);
  linhas.push([
    "Tipo de neurodivergência",
    data.filtros.tipoNeurodivergencia ?? "Todas",
  ]);
  linhas.push(["Bolsa Família", data.filtros.bolsaFamilia ?? "Todos"]);
  linhas.push(["Total de participantes", String(data.total)]);
  linhas.push([]);

  data.indicadores.forEach((secao) => {
    linhas.push([secao.title]);
    linhas.push(["Categoria", "Quantidade", "Percentual"]);

    secao.itens.forEach((item) => {
      linhas.push([
        item.label,
        String(item.count),
        `${item.percentual.toFixed(2)}%`,
      ]);
    });

    linhas.push([]);
  });

  const csv = linhas
    .map((linha) =>
      linha
        .map((valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`)
        .join(";"),
    )
    .join("\n");

  baixarArquivo(
    "\uFEFF" + csv,
    "indicadores-sociodemograficos.csv",
    "text/csv;charset=utf-8;",
  );
}

export function exportToExcel(data: ExportData) {
  const linhas: Array<Array<string | number>> = [];

  linhas.push(["Relatório", "Indicadores Sociodemográficos"]);
  linhas.push(["Ano", data.filtros.ano]);
  linhas.push(["Atividade", data.filtros.atividade]);
  linhas.push(["Turma", data.filtros.turma]);
  linhas.push(["Status da matrícula", data.filtros.status]);
  linhas.push(["Gênero", data.filtros.genero ?? "Todos"]);
  linhas.push(["Raça/cor", data.filtros.racaCor ?? "Todas"]);
  linhas.push(["Faixa de renda", data.filtros.faixaRenda ?? "Todas"]);
  linhas.push(["CadÚnico", data.filtros.cadunico ?? "Todos"]);
  linhas.push(["Tipo de deficiência", data.filtros.tipoDeficiencia ?? "Todas"]);
  linhas.push([
    "Tipo de neurodivergência",
    data.filtros.tipoNeurodivergencia ?? "Todas",
  ]);
  linhas.push(["Bolsa Família", data.filtros.bolsaFamilia ?? "Todos"]);
  linhas.push(["Total de participantes", data.total]);
  linhas.push([]);

  data.indicadores.forEach((secao) => {
    linhas.push([secao.title]);
    linhas.push(["Categoria", "Quantidade", "Percentual"]);

    secao.itens.forEach((item) => {
      linhas.push([item.label, item.count, Number(item.percentual) / 100]);
    });

    linhas.push([]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(linhas);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Indicadores");

  XLSX.writeFile(workbook, "indicadores-sociodemograficos.xlsx");
}
