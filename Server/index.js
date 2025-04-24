console.log("Server voor LLM")
import {HumanMessage, SystemMessage, AIMessage} from "@langchain/core/messages";
import { AzureChatOpenAI, AzureOpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import express from "express"
import cors from "cors"
import {TextLoader} from "langchain/document_loaders/fs/text";
import {RecursiveCharacterTextSplitter} from "langchain/text_splitter";
import {FaissStore} from "@langchain/community/vectorstores/faiss";
import {PDFLoader} from "@langchain/community/document_loaders/fs/pdf";

const app = express();
const port = process.env.EXPRESS_PORT;

let vectorStore;

const embeddings = new AzureOpenAIEmbeddings({
    temperature: 0,
    azureOpenAIApiEmbeddingsDeploymentName: process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME,
});

vectorStore = await FaissStore.load("./vectordata", embeddings);

const model = new AzureChatOpenAI({ temperature: 0.2 });

app.use(express.urlencoded({extended:true}));
app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
    res.json('Hello world!');
});

app.post('/joke', async (req, res) => {
    const chat = await model.invoke("Tell me a dad joke")
    console.log(chat.content)
    res.json({
        joke: chat.content
    });
});

app.post('/chat', async (req, res, next) => {
    const relevantDocs = await vectorStore.similaritySearch("What is this document about?", 3);
    const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");
    const imageReq = req.body.date
    console.log(imageReq)

    const messages = [
        new SystemMessage(
            `If ${imageReq} exists the you have to run ${next}` +
            'You are a professional astronomer' +
            'You know everything about space' +
            'You specialise knowledge in not yet proven theories like black holes and life on Kepler planets' +
            'You know about the Kepler planets and the facts surrounding them' +
            'You like theorizing on theories regarding quantum theory, black hole theory and how it could help with developments like time manipulation' +
            'You talk in a way that is understandable for most normal people' +
            'You tend to give sort of long explanations about what is asked of you' +
            `You use ${context} when asked about the James Webb Space Telescope (or JWST)`)
    ]

    for (let {human, ai} of req.body.history) {
        messages.push(
            new HumanMessage(human),
            new AIMessage(ai)
        )
    }

    messages.push(new HumanMessage(`${req.body.q}`))

    // const chat = await model.invoke(messages)
    const stream = await model.stream(messages);
    // console.log(stream.content)
    res.setHeader("Content-Type", "text/plain");
    for await (const chunk of stream) {
        // console.log(chunk.content);
        await (new Promise(resolve => setTimeout(() =>resolve(), 50)))
        res.write(chunk.content);
    }
    res.end();
});

app.post('/image', async (req, res, next) => {
    let imageDate = req.body.date
    let imageUrl = ""
    let explanation = ""
    console.log("Fetching image based on date")

    try {
        const response = await fetch(`https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&date=${imageDate}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (response.ok) {
            const data = await response.json();
            console.log(data);
            imageUrl = data.url
            explanation = data.explanation
        } else {
            console.log()
        }
    } catch (error) {
        console.error('Er is een fout opgetreden:', error);
    }

    res.json({
        url: imageUrl,
        explanation: explanation
    })
});

app.listen(port, () => {
    console.log(`Server draait op http://localhost:${port}`);
});

// async function createVectorstore() {
//     try {
//         const loader = new PDFLoader("./public/The_James_Webb_Space_Telescope.pdf");
//         const docs = await loader.load();
//
//         const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 100, chunkOverlap: 50 });
//         const splitDocs = await textSplitter.splitDocuments(docs);
//
//         console.log(`Document split into ${splitDocs.length} chunks. Now saving into vector store.`);
//
//         vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);
//         console.log("Vector store created successfully.");
//         await vectorStore.save("./vectordata");
// } catch (error) {
//     console.error("Error creating vector store:", error);
// }
// }
// createVectorstore()