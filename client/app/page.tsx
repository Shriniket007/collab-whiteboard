// version 4
"use client";

import React, { FC, useEffect, useState } from "react";
import { useDraw } from "../hooks/useDraw";
import { ChromePicker } from "react-color";
import { io } from "socket.io-client";
import { drawLine } from "../utils/drawLine";

const socket = io("http://localhost:3001");

interface PageProps {}

type Point = {
  x: number;
  y: number;
};

type Draw = {
  prevPoint: Point | null;
  currentPoint: Point;
  ctx: CanvasRenderingContext2D | null;
};

type DrawLineProps = {
  prevPoint: Point | null;
  currentPoint: Point;
  color: string;
};

const Page: FC<PageProps> = () => {
  const [color, setColor] = useState<string>("#000");
  const [downloadURL, setDownloadURL] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    { sender: string; message: string }[]
  >([]);

  const [newMessage, setNewMessage] = useState<string>("");
  const [room, setRoom] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [joined, setJoined] = useState<boolean>(false);

  const { canvasRef, onMouseDown, clear } = useDraw(createLine);

  useEffect(() => {
    if (joined) {
      const ctx = canvasRef.current?.getContext("2d");

      socket.emit("client-ready", { room, userName });

      socket.on("get-canvas-state", () => {
        if (!canvasRef.current?.toDataURL()) return;
        console.log("sending canvas state");
        socket.emit("canvas-state", canvasRef.current.toDataURL(), room);
      });

      socket.on("canvas-state-from-server", (state: string) => {
        console.log("I received the state");
        const img = new Image();
        img.src = state;
        img.onload = () => {
          ctx?.drawImage(img, 0, 0);
        };
      });

      socket.on(
        "draw-line",
        ({ prevPoint, currentPoint, color }: DrawLineProps) => {
          if (!ctx) return console.log("no ctx here");
          drawLine({ prevPoint, currentPoint, ctx, color });
        }
      );

      socket.on("clear", clear);
      socket.on(
        "receive-message",
        (message: { sender: string; message: string }) => {
          setMessages([...messages, message]);
        }
      );

      return () => {
        socket.off("draw-line");
        socket.off("get-canvas-state");
        socket.off("canvas-state-from-server");
        socket.off("clear");
        socket.off("receive-message");
      };
    }
  }, [canvasRef, messages, room, userName, joined]);

  function createLine({ prevPoint, currentPoint, ctx }: Draw) {
    if (!ctx) return; // Skip drawing if ctx is null
    setDownloadURL(null); // Clear download URL when drawing a new line
    socket.emit("draw-line", { prevPoint, currentPoint, color }, room);
    drawLine({ prevPoint, currentPoint, ctx, color });
  }

  const handleJoinRoom = () => {
    if (room.trim() === "" || userName.trim() === "") return;
    setJoined(true);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const downloadCanvas = document.createElement("canvas");
    const downloadContext = downloadCanvas.getContext("2d");

    if (!downloadContext) return;

    downloadCanvas.width = canvas.width;
    downloadCanvas.height = canvas.height;
    downloadContext.fillStyle = "#ffffff"; // Set white background
    downloadContext.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);

    // Draw existing canvas content onto the new canvas
    downloadContext.drawImage(canvas, 0, 0);

    // Create download link
    const downloadLink = document.createElement("a");
    const dataURL = downloadCanvas.toDataURL("image/png");
    downloadLink.href = dataURL;
    downloadLink.download = "canvas_image.png";

    // Trigger click on the link and remove it
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    setDownloadURL(dataURL);
  };

  const handleSendMessage = () => {
    if (newMessage.trim() === "") return;
    const updatedMessages = [
      ...messages,
      { sender: userName, message: newMessage },
    ];
    setMessages(updatedMessages);

    socket.emit(
      "send-message",
      { sender: userName, message: newMessage },
      room
    );
    setNewMessage("");
  };

  return (
    <div className="relative">
      {!joined ? (
        <div className="flex flex-col items-center justify-center h-screen">
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="p-2 mb-4 border rounded"
          />
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Enter room number"
            className="p-2 mb-4 border rounded"
          />
          <button
            onClick={handleJoinRoom}
            className="p-2 bg-blue-500 text-white rounded"
          >
            Join Room
          </button>
        </div>
      ) : (
        <div>
          {/* Header section */}
          <div className="bg-gray-200 py-4 px-8 mb-4 flex justify-around">
            <h2 className="text-xl font-semibold">Room: {room}</h2>
            <p className="text-lg font-semibold">Username: {userName}</p>
          </div>

          {/* Left side with drawing canvas */}
          <div className="w-screen h-screen bg-white flex justify-center items-center">
            <div className="flex flex-col gap-10 pr-10">
              <ChromePicker color={color} onChange={(e) => setColor(e.hex)} />
              <button
                type="button"
                className="p-2 rounded-md border border-black"
                onClick={() => socket.emit("clear", room)}
              >
                Clear canvas
              </button>
              <button
                type="button"
                className="p-2 rounded-md border border-black"
                onClick={handleDownload}
              >
                Download Image
              </button>
            </div>
            <canvas
              ref={canvasRef}
              onMouseDown={onMouseDown}
              width={750}
              height={750}
              className="border border-black rounded-md"
            />
          </div>

          {/* Right side with chat */}
          <div className="absolute top-20 right-0 z-10 p-4 w-1/4 bg-gray-100 rounded-lg shadow-lg">
            <div className="h-full border-l border-gray-300 pl-4">
              <h2 className="mb-4 text-xl font-semibold">Chat</h2>
              <div className="overflow-y-auto max-h-96 mb-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`mb-2 p-2 ${
                      index % 2 === 0 ? "bg-blue-100" : "bg-gray-200"
                    } rounded-md`}
                  >
                    <div className="flex justify-between">
                      <span className="font-semibold">{message.sender}</span>
                      <span className="text-xs text-gray-500">Just now</span>
                    </div>
                    <div>{message.message}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 border border-gray-300 p-2 rounded-md mr-2"
                  placeholder="Type a message..."
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;

// version 3
// "use client";

// import { FC, useEffect, useState } from "react";
// import { useDraw } from "../hooks/useDraw";
// import { ChromePicker } from "react-color";

// import { io } from "socket.io-client";
// import { drawLine } from "../utils/drawLine";

// const socket = io("http://localhost:3001");

// interface pageProps {}

// type Point = {
//   x: number;
//   y: number;
// };

// type Draw = {
//   prevPoint: Point | null;
//   currentPoint: Point;
//   ctx: CanvasRenderingContext2D | null;
// };

// type DrawLineProps = {
//   prevPoint: Point | null;
//   currentPoint: Point;
//   color: string;
// };

// const page: FC<pageProps> = ({}) => {
//   const [color, setColor] = useState<string>("#000");
//   const [downloadURL, setDownloadURL] = useState<string | null>(null);
//   const [messages, setMessages] = useState<string[]>([]);
//   const [newMessage, setNewMessage] = useState<string>("");

//   const { canvasRef, onMouseDown, clear } = useDraw(createLine);

//   useEffect(() => {
//     const ctx = canvasRef.current?.getContext("2d");

//     socket.emit("client-ready");

//     socket.on("get-canvas-state", () => {
//       if (!canvasRef.current?.toDataURL()) return;
//       console.log("sending canvas state");
//       socket.emit("canvas-state", canvasRef.current.toDataURL());
//     });

//     socket.on("canvas-state-from-server", (state: string) => {
//       console.log("I received the state");
//       const img = new Image();
//       img.src = state;
//       img.onload = () => {
//         ctx?.drawImage(img, 0, 0);
//       };
//     });

//     socket.on(
//       "draw-line",
//       ({ prevPoint, currentPoint, color }: DrawLineProps) => {
//         if (!ctx) return console.log("no ctx here");
//         drawLine({ prevPoint, currentPoint, ctx, color });
//       }
//     );

//     socket.on("clear", clear);

//     socket.on("receive-message", (message: string) => {
//       setMessages([...messages, message]);
//     });

//     return () => {
//       socket.off("draw-line");
//       socket.off("get-canvas-state");
//       socket.off("canvas-state-from-server");
//       socket.off("clear");
//       socket.off("receive-message");
//     };
//   }, [canvasRef, messages]);

//   function createLine({ prevPoint, currentPoint, ctx }: Draw) {
//     if (!ctx) return; // Skip drawing if ctx is null
//     setDownloadURL(null); // Clear download URL when drawing a new line
//     socket.emit("draw-line", { prevPoint, currentPoint, color });
//     drawLine({ prevPoint, currentPoint, ctx, color });
//   }

//   const handleDownload = () => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;

//     const downloadCanvas = document.createElement("canvas");
//     const downloadContext = downloadCanvas.getContext("2d");

//     if (!downloadContext) return;

//     downloadCanvas.width = canvas.width;
//     downloadCanvas.height = canvas.height;
//     downloadContext.fillStyle = "#ffffff"; // Set white background
//     downloadContext.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);

//     // Draw existing canvas content onto the new canvas
//     downloadContext.drawImage(canvas, 0, 0);

//     // Create download link
//     const downloadLink = document.createElement("a");
//     const dataURL = downloadCanvas.toDataURL("image/png");
//     downloadLink.href = dataURL;
//     downloadLink.download = "canvas_image.png";

//     // Trigger click on the link and remove it
//     document.body.appendChild(downloadLink);
//     downloadLink.click();
//     document.body.removeChild(downloadLink);

//     setDownloadURL(dataURL);
//   };

//   const handleSendMessage = () => {
//     if (newMessage.trim() === "") return;
//     const updatedMessages = [...messages, newMessage];
//     setMessages(updatedMessages);
//     socket.emit("send-message", newMessage);
//     setNewMessage("");
//   };

//   return (
//     <div className="relative">
//       {/* Left side with drawing canvas */}
//       <div className="w-screen h-screen bg-white flex justify-center items-center">
//         <div className="flex flex-col gap-10 pr-10">
//           <ChromePicker color={color} onChange={(e) => setColor(e.hex)} />
//           <button
//             type="button"
//             className="p-2 rounded-md border border-black"
//             onClick={() => socket.emit("clear")}
//           >
//             Clear canvas
//           </button>
//           <button
//             type="button"
//             className="p-2 rounded-md border border-black"
//             onClick={handleDownload}
//           >
//             Download Image
//           </button>
//         </div>
//         <canvas
//           ref={canvasRef}
//           onMouseDown={onMouseDown}
//           width={750}
//           height={750}
//           className="border border-black rounded-md"
//         />
//       </div>

//       {/* Right side with chat */}
//       <div className="absolute top-0 right-0 z-10 p-4 w-1/4 bg-[#aaa7a7] rounded-lg">
//         <div
//           style={{
//             height: "100%",
//             borderLeft: "1px solid #000",
//             padding: "10px",
//             boxSizing: "border-box",
//             overflowY: "auto",
//           }}
//         >
//           <h2 className="mb-4 text-xl font-semibold">Chat</h2>
//           <div style={{ marginBottom: "10px", minHeight: "300px" }}>
//             {messages.map((message, index) => (
//               <div
//                 key={index}
//                 className={`mb-2 p-2 ${
//                   index % 2 === 0 ? "bg-blue-200 text-right" : "bg-gray-200"
//                 }`}
//               >
//                 {message}
//               </div>
//             ))}
//           </div>
//           <input
//             type="text"
//             value={newMessage}
//             onChange={(e) => setNewMessage(e.target.value)}
//             className="border p-2 mb-2"
//             placeholder="Type a message..."
//           />
//           <button
//             type="button"
//             onClick={handleSendMessage}
//             className="bg-blue-500 text-white p-2 rounded"
//           >
//             Send
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default page;

// info
// WebSocket is a communication protocol that provides full-duplex communication channels over a single TCP connection. It allows for bidirectional communication between a client and a server, meaning both the client and server can send messages to each other at any time without having to wait for a response.

// WebSocket starts with an HTTP handshake, but once the connection is established, it upgrades to a WebSocket connection. This upgrade allows for a persistent, low-latency connection between the client and server, making it ideal for applications that require real-time data transfer, such as chat applications, online gaming, financial trading platforms, and live sports updates.

// WebSocket is designed to be lightweight, efficient, and easy to use, making it a popular choice for developers building interactive web applications. It enables developers to create dynamic, real-time experiences for users without relying on techniques like long-polling or server-sent events, which may have limitations in terms of performance and scalability.

// with download button(verison 2)
// "use client";

// import { FC, useEffect, useState } from "react";
// import { useDraw } from "../hooks/useDraw";
// import { ChromePicker } from "react-color";

// import { io } from "socket.io-client";
// import { drawLine } from "../utils/drawLine";

// const socket = io("http://localhost:3001");

// interface pageProps {}

// type Point = {
//   x: number;
//   y: number;
// };

// type Draw = {
//   prevPoint: Point | null;
//   currentPoint: Point;
//   ctx: CanvasRenderingContext2D | null;
// };

// type DrawLineProps = {
//   prevPoint: Point | null;
//   currentPoint: Point;
//   color: string;
// };

// const page: FC<pageProps> = ({}) => {
//   const [color, setColor] = useState<string>("#000");
//   const [downloadURL, setDownloadURL] = useState<string | null>(null);
//   const { canvasRef, onMouseDown, clear } = useDraw(createLine);

//   useEffect(() => {
//     const ctx = canvasRef.current?.getContext("2d");

//     socket.emit("client-ready");

//     socket.on("get-canvas-state", () => {
//       if (!canvasRef.current?.toDataURL()) return;
//       console.log("sending canvas state");
//       socket.emit("canvas-state", canvasRef.current.toDataURL());
//     });

//     socket.on("canvas-state-from-server", (state: string) => {
//       console.log("I received the state");
//       const img = new Image();
//       img.src = state;
//       img.onload = () => {
//         ctx?.drawImage(img, 0, 0);
//       };
//     });

//     socket.on(
//       "draw-line",
//       ({ prevPoint, currentPoint, color }: DrawLineProps) => {
//         if (!ctx) return console.log("no ctx here");
//         drawLine({ prevPoint, currentPoint, ctx, color });
//       }
//     );

//     socket.on("clear", clear);

//     return () => {
//       socket.off("draw-line");
//       socket.off("get-canvas-state");
//       socket.off("canvas-state-from-server");
//       socket.off("clear");
//     };
//   }, [canvasRef]);

//   function createLine({ prevPoint, currentPoint, ctx }: Draw) {
//     if (!ctx) return; // Skip drawing if ctx is null
//     setDownloadURL(null); // Clear download URL when drawing a new line
//     socket.emit("draw-line", { prevPoint, currentPoint, color });
//     drawLine({ prevPoint, currentPoint, ctx, color });
//   }

//   const handleDownload = () => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;

//     const downloadCanvas = document.createElement("canvas");
//     const downloadContext = downloadCanvas.getContext("2d");

//     if (!downloadContext) return;

//     downloadCanvas.width = canvas.width;
//     downloadCanvas.height = canvas.height;
//     downloadContext.fillStyle = "#ffffff"; // Set white background
//     downloadContext.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);

//     // Draw existing canvas content onto the new canvas
//     downloadContext.drawImage(canvas, 0, 0);

//     // Create download link
//     const downloadLink = document.createElement("a");
//     const dataURL = downloadCanvas.toDataURL("image/png");
//     downloadLink.href = dataURL;
//     downloadLink.download = "canvas_image.png";

//     // Trigger click on the link and remove it
//     document.body.appendChild(downloadLink);
//     downloadLink.click();
//     document.body.removeChild(downloadLink);

//     setDownloadURL(dataURL);
//   };

//   return (
//     <div className="w-screen h-screen bg-white flex justify-center items-center">
//       <div className="flex flex-col gap-10 pr-10">
//         <ChromePicker color={color} onChange={(e) => setColor(e.hex)} />
//         <button
//           type="button"
//           className="p-2 rounded-md border border-black"
//           onClick={() => socket.emit("clear")}
//         >
//           Clear canvas
//         </button>
//         <button
//           type="button"
//           className="p-2 rounded-md border border-black"
//           onClick={handleDownload}
//         >
//           Download Image
//         </button>
//       </div>
//       <canvas
//         ref={canvasRef}
//         onMouseDown={onMouseDown}
//         width={750}
//         height={750}
//         className="border border-black rounded-md"
//       />
//     </div>
//   );
// };

// export default page;

// // original
// 'use client'

// import { FC, useEffect, useState } from 'react'
// import { useDraw } from '../hooks/useDraw'
// import { ChromePicker } from 'react-color'

// import { io } from 'socket.io-client'
// import { drawLine } from '../utils/drawLine'
// const socket = io('http://localhost:3001')

// interface pageProps {}

// type DrawLineProps = {
//   prevPoint: Point | null
//   currentPoint: Point
//   color: string
// }

// const page: FC<pageProps> = ({}) => {
//   const [color, setColor] = useState<string>('#000')
//   const { canvasRef, onMouseDown, clear } = useDraw(createLine)

//   useEffect(() => {
//     const ctx = canvasRef.current?.getContext('2d')

//     socket.emit('client-ready')

//     socket.on('get-canvas-state', () => {
//       if (!canvasRef.current?.toDataURL()) return
//       console.log('sending canvas state')
//       socket.emit('canvas-state', canvasRef.current.toDataURL())
//     })

//     socket.on('canvas-state-from-server', (state: string) => {
//       console.log('I received the state')
//       const img = new Image()
//       img.src = state
//       img.onload = () => {
//         ctx?.drawImage(img, 0, 0)
//       }
//     })

//     socket.on('draw-line', ({ prevPoint, currentPoint, color }: DrawLineProps) => {
//       if (!ctx) return console.log('no ctx here')
//       drawLine({ prevPoint, currentPoint, ctx, color })
//     })

//     socket.on('clear', clear)

//     return () => {
//       socket.off('draw-line')
//       socket.off('get-canvas-state')
//       socket.off('canvas-state-from-server')
//       socket.off('clear')
//     }
//   }, [canvasRef])

//   function createLine({ prevPoint, currentPoint, ctx }: Draw) {
//     socket.emit('draw-line', { prevPoint, currentPoint, color })
//     drawLine({ prevPoint, currentPoint, ctx, color })
//   }

//   return (
//     <div className='w-screen h-screen bg-white flex justify-center items-center'>
//       <div className='flex flex-col gap-10 pr-10'>
//         <ChromePicker color={color} onChange={(e) => setColor(e.hex)} />
//         <button
//           type='button'
//           className='p-2 rounded-md border border-black'
//           onClick={() => socket.emit('clear')}>
//           Clear canvas
//         </button>
//       </div>
//       <canvas
//         ref={canvasRef}
//         onMouseDown={onMouseDown}
//         width={750}
//         height={750}
//         className='border border-black rounded-md'
//       />
//     </div>
//   )
// }

// export default page
