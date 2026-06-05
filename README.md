# Calculadora de Horários

Aplicação web simples para calcular horário de saída, estimar valor de horas extras e registrar horas extras por dia.

Site publicado: https://jotatech245.github.io/calculadora-horario/

## Funcionalidades

- Calcula o horário de saída usando entrada, tempo de trabalho e intervalo.
- Aceita jornadas com casas decimais, como `7.5` horas.
- Estima o valor de horas extras com divisor mensal e adicional configuráveis.
- Registra horas extras por dia em calendário mensal.
- Mostra o total de horas extras do mês.
- Mantém um perfil com foto, cargo e padrões de jornada.
- Salva os registros no navegador usando `localStorage`.

## Como rodar localmente

Abra o arquivo `index.html` no navegador ou sirva a pasta com um servidor estático.

```bash
npx serve .
```

## V2

Esta versão corrige os cálculos com decimais, melhora o registro mensal, remove funções quebradas e reorganiza a interface para ficar mais prática no celular.

## Supabase + Vercel

A versão com login usa Supabase Auth e as tabelas `overtime_entries` e `profiles` para sincronizar os registros e dados básicos entre celular e computador.

1. No Supabase, rode o SQL de `supabase/schema.sql`.
2. No Vercel, adicione as variáveis de ambiente:

```bash
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-ou-publishable
```

3. Faça um novo deploy.

Nunca use a `service_role key` no frontend. A segurança dos registros depende das políticas RLS do arquivo SQL.

A foto do perfil é reduzida no navegador antes de salvar para evitar imagens grandes no banco.
