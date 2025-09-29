import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Configure variáveis de ambiente
const SHOP = process.env.SHOP; // ex: boothus.myshopify.com
const ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

// Endpoint para salvar código na coleção
app.post("/save-code", async (req, res) => {
  const { sellerHandle, sellerCode } = req.body;

  if (!sellerHandle || !sellerCode) {
    return res.status(400).json({ error: "Envie sellerHandle e sellerCode" });
  }

  try {
    // 1. Buscar a coleção pelo handle
    const queryFind = `
      query($handle: String!) {
        collectionByHandle(handle: $handle) {
          id
          title
        }
      }
    `;

    let response = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": ADMIN_API_TOKEN
      },
      body: JSON.stringify({
        query: queryFind,
        variables: { handle: sellerHandle }
      })
    });

    const dataFind = await response.json();
    const collection = dataFind.data.collectionByHandle;
    if (!collection) {
      return res.status(404).json({ error: "Coleção não encontrada" });
    }

    const newTitle = `${sellerCode} | ${collection.title}`;

    // 2. Atualizar a coleção com o código no título + metafield
    const mutationUpdate = `
      mutation updateCollection($id: ID!, $code: String!, $title: String!) {
        collectionUpdate(input: {
          id: $id,
          title: $title,
          metafields: [
            { namespace: "custom", key: "booth_s_number", type: "single_line_text_field", value: $code }
          ]
        }) {
          collection {
            id
            title
            metafield(namespace: "custom", key: "booth_s_number") {
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    response = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": ADMIN_API_TOKEN
      },
      body: JSON.stringify({
        query: mutationUpdate,
        variables: { id: collection.id, code: sellerCode, title: newTitle }
      })
    });

    const dataUpdate = await response.json();

    res.json(dataUpdate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar coleção" });
  }
});

// Inicia o servidor
app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
