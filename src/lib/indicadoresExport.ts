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
  const linhas: any[][] = [];

  linhas.push(["Relatório", "Indicadores Sociodemográficos"]);
  linhas.push(["Ano", data.filtros.ano]);
  linhas.push(["Atividade", data.filtros.atividade]);
  linhas.push(["Turma", data.filtros.turma]);
  linhas.push(["Status da matrícula", data.filtros.status]);
  linhas.push(["Total de participantes", data.total]);
  linhas.push([]);

  data.indicadores.forEach((secao) => {
    linhas.push([secao.title]);
    linhas.push(["Categoria", "Quantidade", "Percentual"]);

    secao.itens.forEach((item) => {
      linhas.push([
        item.label,
        item.count,
        Number(item.percentual) / 100,
      ]);
    });

    linhas.push([]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(linhas);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Indicadores");

  XLSX.writeFile(workbook, "indicadores-sociodemograficos.xlsx");
}

export function exportToPDF(data: ExportData) {
  const janela = window.open("", "_blank");

  if (!janela) return;

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Indicadores Sociodemográficos</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 32px;
            color: #111;
          }

          h1 {
            font-size: 22px;
            margin-bottom: 16px;
          }

          h2 {
            font-size: 16px;
            margin-top: 28px;
            margin-bottom: 10px;
          }

          .info {
            margin-bottom: 20px;
            font-size: 13px;
            line-height: 1.6;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            font-size: 12px;
          }

          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }

          th {
            background: #f2f2f2;
          }

          .total {
            font-weight: bold;
            margin-top: 8px;
          }

          @media print {
            body {
              padding: 24px;
            }
          }
        </style>
      </head>

      <body>
        <h1>Indicadores Sociodemográficos</h1>

        <div class="info">
          <div><strong>Ano:</strong> ${data.filtros.ano}</div>
          <div><strong>Atividade:</strong> ${data.filtros.atividade}</div>
          <div><strong>Turma:</strong> ${data.filtros.turma}</div>
          <div><strong>Status da matrícula:</strong> ${data.filtros.status}</div>
          <div class="total"><strong>Total de participantes:</strong> ${data.total}</div>
        </div>

        ${data.indicadores
      .map(
        (secao) => `
              <h2>${secao.title}</h2>
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Quantidade</th>
                    <th>Percentual</th>
                  </tr>
                </thead>
                <tbody>
                  ${secao.itens
            .map(
              (item) => `
                        <tr>
                          <td>${item.label}</td>
                          <td>${item.count}</td>
                          <td>${item.percentual.toFixed(2)}%</td>
                        </tr>
                      `,
            )
            .join("")}
                </tbody>
              </table>
            `,
      )
      .join("")}
      </body>
    </html>
  `;

  janela.document.open();
  janela.document.write(html);
  janela.document.close();

  janela.onload = () => {
    janela.focus();
    janela.print();
  };
}