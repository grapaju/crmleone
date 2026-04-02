import React from "react";
import Webcam from "react-webcam";
import { useState } from "react";

const CameraCapture = ({ onCapture, onClose, images }) => {
  const webcamRef = React.useRef(null);
  const [previewImg, setPreviewImg] = useState(null);

  // Configuração de resolução alta e câmera traseira
  const videoConstraints = {
    facingMode: "environment",
    width: { ideal: 1280 },
    height: { ideal: 720 }
  };

  const capture = React.useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setPreviewImg(imageSrc);
  }, [webcamRef]);

  const confirmCapture = () => {
    if (previewImg) {
      onCapture(previewImg);
      setPreviewImg(null);
    }
  };
  const discardCapture = () => setPreviewImg(null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 flex flex-col items-center max-w-lg w-full">
        <div className="mb-4 w-full">
          <h2 className="text-white text-lg font-bold mb-2">Capturar Documento</h2>
          <ul className="text-slate-300 text-xs mb-2 list-disc pl-4">
            <li>Alinhe o documento centralizado e sem cortes</li>
            <li>Evite reflexos e garanta boa iluminação</li>
            <li>Use a câmera traseira para melhor qualidade</li>
            <li>Amplie a prévia para conferir legibilidade</li>
          </ul>
        </div>
        {!previewImg ? (
          <>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="rounded-lg mb-4 w-full max-w-md"
              width={1280}
              height={720}
              videoConstraints={videoConstraints}
            />
            <div className="flex space-x-2 mb-4">
              <button onClick={capture} className="bg-blue-600 text-white px-4 py-2 rounded">Capturar</button>
              <button onClick={onClose} className="bg-slate-600 text-white px-4 py-2 rounded">Fechar</button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center mb-4 w-full">
            <img src={previewImg} alt="Prévia" className="rounded-lg border w-full max-w-md mb-2" style={{ maxHeight: 400 }} />
            <div className="flex space-x-2">
              <button onClick={confirmCapture} className="bg-green-600 text-white px-4 py-2 rounded">Salvar</button>
              <button onClick={discardCapture} className="bg-red-600 text-white px-4 py-2 rounded">Descartar</button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((img, idx) => (
            <img key={idx} src={img} alt={`Página ${idx+1}`} className="w-16 h-16 object-cover rounded border cursor-pointer" onClick={() => setPreviewImg(img)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
