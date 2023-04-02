const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const app = express();
const {Configuration,OpenAIApi} = require("openai");
require('dotenv').config()

const PORT = 4000;

const configuration = new Configuration({
    apiKey : process.env.SECRET_KEY
});

const openai = new OpenAIApi(configuration);

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());
app.use("/uploads",express.static("uploads"))

const storage = multer.diskStorage({
    destination: (res,file,cb) => {
        cb(null,"uploads");
    },
    filename: (req,file,cb) => {
        cb(null,Date.now() + path.extname(file.originalname));
    },
})

const generateID = () => Math.random().toString(36).substring(2, 10);

const upload = multer({
    storage : storage,
    limits: {fileSize: 1024*1024 *5},
})

const database = [];

const GPTFunction = async (text) => {
    const response = await openai.createCompletion({
        model : 'text-davinci-003',
        prompt: text,
        temperature : 0.6,
        max_tokens: 250,
        top_p : 1,
        frequency_penalty: 1,
        presence_penalty : 1
    })
    return response.data.choices[0].text;
}


app.get('/api',(req,res) => {
    res.json({
        message: "Subscribe to the Channel"
    })
})

app.post("/resume/create",upload.single("headshotImage"),async(req,res) => {
    const {fullName,currentPosition,currentLength,currentTechnologies,workHistory} = req.body;

    const workArray = JSON.parse(workHistory);

    const newEntry = {
        id: generateID(),
        fullName,
        image_url : `http://localhost:4000/uploads/${req.file.filename}`,
        currentPosition,
        currentLength,
        currentTechnologies,
        workHistory  : workArray
    }

    const prompt1 = `I am writing a resume, my details are \n name: ${fullName} \n role: ${currentPosition} (${currentLength} years). \n I write in the technolegies: ${currentTechnologies}. Can you write a 100 words description for the top of the resume(first person writing)?`;

	const prompt2 = `I am writing a resume, my details are \n name: ${fullName} \n role: ${currentPosition} (${currentLength} years). \n I write in the technolegies: ${currentTechnologies}. Can you write 10 points for a resume on what I am good at?`;

    const remainderText = () =>{
        let stringText = "";
        for(let i=0;i<workArray.length;i++){
            stringText += `${workArray[i].name} as a ${workArray[i].position}`;
        }
        return stringText;
    }

    const prompt3 = `I am writing a resume, my details are \n name: ${fullName} \n role: ${currentPosition} (${currentLength} years). \n During my years I worked at ${
		workArray.length
	} companies. ${remainderText()} \n Can you write me 50 words for each company seperated in numbers of my succession in the company (in first person)?`;

    const objective = await GPTFunction(prompt1);
    const keypoints = await GPTFunction(prompt2);
    const jobResponsibilities = await GPTFunction(prompt3);

    const chatgptData = {objective,keypoints,jobResponsibilities};
    const data = {...newEntry,...chatgptData};
    database.push(data);
    console.log(chatgptData);
    res.json({
        message: "Request Sucessful",
        data
    })
})

app.listen(PORT,() =>{
    console.log(`Server started on port: ${PORT}`);
})