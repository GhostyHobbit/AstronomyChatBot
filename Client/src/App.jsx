import React, {use, useRef, useState} from 'react'
import ReactDOM from 'react-dom/client';
import reactLogo from './assets/react.svg'
import './App.css'
import {requestFormReset} from "react-dom";

function App() {
    const [formData, setFormData] = useState("")
    const [answer, setAnswer] = useState("")
    const [history, setHistory] = useState([])
    const [button, setButton] = useState(false)
    const [url, setUrl] = useState("")
    const [explanation, setExplanation] = useState("")

    function handleSubmit(e) {
        setButton(true)
        setAnswer("")
        e.preventDefault()
        askQuestion()
    }

    function extractDateFromString(text) {
        const isoFormat = /\b(\d{4})-(\d{2})-(\d{2})\b/;
        const longFormat = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i;

        let match = text.match(isoFormat);
        if (match) return match[0];

        match = text.match(longFormat);
        if (match) {
            const parsed = new Date(match[0]);
            const formatted = parsed.toISOString().split('T')[0];
            return formatted;
        }

        return null;
    }

    async function askQuestion() {
        let date = extractDateFromString(formData.chatfield)

        const options = {
            method: 'POST',
            mode:'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ q: formData.chatfield, history: history, date: date })
        }

        const imgOptions = {
            method: 'POST',
            mode:'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date: date })
        }

        const imgResponse = await fetch("http://localhost:8000/image", imgOptions)
        if(imgResponse.ok){
            let data = await imgResponse.json()
            setExplanation(data.explanation)
            setUrl(data.url)

            setHistory([...history, { human: formData.chatfield, ai: answer }])
            console.log([...history, { human: formData.chatfield, ai: answer }])
            setButton(false)
        } else {
            console.error(imgResponse.status)
        }

        const response = await fetch("http://localhost:8000/chat", options)
        if(response.ok){
            // const data = response
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                setAnswer(prevAnswer => prevAnswer + chunk)
            }
            setHistory([...history, { human: formData.chatfield, ai: answer }])
            console.log([...history, { human: formData.chatfield, ai: answer }])
            setButton(false)
        } else {
            console.error(response.status)
        }
    }

    const handleInputChange = (event) => {
        const {name, value} = event.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

  return (
    <>
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6 shadow-lg min-h-dvh">
            <h1 className="text-white text-3xl font-bold mb-4 text-center">FallStar82</h1>
            <p className="text-white text-center m-2">
                Your local astronomy teacher. Ask me questions about space and stuff. I know way too much outdated data about the James Webb Space Telescope.
                If you ask me for a date (format YYYY-MM-DD) I will show you the Astronomy picture of that Day.
                Make sure the date is after 1995-06-16. That was when the first APOD pic was posted.
            </p>
            <div className="border-2 border-blue-500 rounded-lg bg-gray-800 text-white p-2 w-full min-h-[60vh] mb-4">
                <div className="w-[80%] m-4 bg-blue-950 rounded-lg p-4" id="botAnswer">
                    <p className="text-white text-lg font-bold">FallStar82</p>
                    { url ?
                        (
                            <>
                                <img src={url} alt="Pic_of_the_day" className="my-4 rounded-lg"/>
                                <p className="text-white text-lg" id="answer">{explanation}</p>
                            </>
                        )
                        :
                        (<p className="text-white text-lg" id="answer">{answer}</p>)
                    }
                </div>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col">
                <input
                    required
                    type="text"
                    id="chatfield"
                    name="chatfield"
                    value={formData.value}
                    onChange={handleInputChange}
                    className="border-2 border-blue-500 rounded-lg bg-gray-800 text-white p-2 w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your question here..."
                />
                { button ?
                    (<button type="submit" className="bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200" disabled>Loading</button>)
                    :
                    (<button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200">Send</button>)
                }
            </form>
        </div>
    </>
  )
}

export default App

// const element = React.createElement('p', { className: "text-white text-lg"}, answer);
// const root = ReactDOM.createRoot(document.getElementById('botAnswer'));
// root.render(element);
