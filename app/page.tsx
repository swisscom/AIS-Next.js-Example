"use client"
import { useState } from "react";
import { Document, Page, } from "react-pdf";

interface PageNumbersProps {
  pageNumber: number;
  setPageNumber: React.Dispatch<React.SetStateAction<number>>;
  numPages: number;
}

const PageNumbers: React.FC<PageNumbersProps> = ({ pageNumber, setPageNumber, numPages }) => {
  return (
    <div style={{ marginTop: "16px" }}>
      <div style={{ marginBottom: "16px" }}>
        Page {pageNumber} of {numPages}
      </div>
      {pageNumber > 1 && <button onClick={() => setPageNumber((prevState) => prevState - 1)}>previous page</button>}
      {pageNumber >= 1 && pageNumber < numPages && (
        <button onClick={() => setPageNumber((prevState) => prevState + 1)}>next page</button>
      )}
    </div>
  );
};


export default function Home() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isFilePicked, setIsFilePicked] = useState(false);

  interface FileChangeEvent extends React.ChangeEvent<HTMLInputElement> {
    target: HTMLInputElement & {
      files: FileList;
    };
  }

  const changeHandler = (event: FileChangeEvent): void => {
    setSelectedFile(event.target.files[0]);
    setIsFilePicked(true);
  };
  const [numPages, setNumPages] = useState<number | null>(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(false);

  const [signedSuccessfully, setSignedSuccessfully] = useState(false);
  const [errorExist, setErrorExist] = useState(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const handleSubmission = () => {
    if (!selectedFile) return;
    
    setLocalStorage();

    const formData = new FormData();

    formData.append("pdf-file", selectedFile);

    fetch("http://localhost:8001/upload", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((result) => {
        console.log("Success:", result);

        setLoading(true);
        signPdf();
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  const setLocalStorage = () => {
    const pdfTitle = selectedFile?.name.substring(0, selectedFile.name.length - 4);

    localStorage.setItem("pdfTitle", JSON.stringify({ pdfTitle }));
  };

  const signPdf = () => {
    const pdfTitle = localStorage.getItem("pdfTitle");

    // temp sign
    fetch("http://localhost:8001/signpdf", {
      method: "POST",
      body: pdfTitle,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((result) => {
        console.log("Success:", result);
        setLoading(false);

        if (result?.error) {
          setErrorExist(result.error);
        } else {
          setSignedSuccessfully(true);
        }
      });
  };

  if (loading)
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        <p style={{ color: "#fff", fontSize: 24 }}>Signing is pending</p>
        <div>...</div>
      </div>
    );

  if (errorExist)
    return (
      <div className="interactionContainer">
        <p>There was an error: {errorExist}</p>
        <button
          className="button"
          onClick={() => {
            setErrorExist(false);
            localStorage.removeItem("pdfTitle");
            setSelectedFile(null);
            setIsFilePicked(false);
          }}
        >
          Sign a new PDF
        </button>
      </div>
    );

  if (signedSuccessfully)
    return (
      <div className="interactionContainer">
        <p>Signed successfully</p>
        <button
          className="button"
          onClick={() => {
            const pdfTitleObj = localStorage.getItem("pdfTitle");
            if (!pdfTitleObj) return;
            
            const pdfTitle = JSON.parse(pdfTitleObj).pdfTitle;
            const newWindow = window.open("http://localhost:8001/uploads/" + pdfTitle, "_blank");
            newWindow?.focus();
          }}
        >
          Download Signed PDF
        </button>
        <button
          className="button"
          onClick={() => {
            setSignedSuccessfully(false);
            localStorage.removeItem("pdfTitle");
            setSelectedFile(null);
            setIsFilePicked(false);
          }}
        >
          Sign a new PDF
        </button>
      </div>
    );

  return (
    <div className="masthead">
      {isFilePicked && (
        <Document file={selectedFile} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={pageNumber} height={800} />
        </Document>
      )}
      <div className="interactionContainer">
        <input type="file" name="file" onChange={changeHandler} />

        {isFilePicked ? (
          <div>
            <p>Filename: {selectedFile?.name}</p>
            <p>Filetype: {selectedFile?.type}</p>
            <p>Size in bytes: {selectedFile?.size}</p>
            <p>lastModifiedDate: {selectedFile?.lastModified ? new Date(selectedFile.lastModified).toLocaleDateString() : ''}</p>
          </div>
        ) : (
          <p>Select a file to show details</p>
        )}
        {isFilePicked && (
          <div>
            <button onClick={handleSubmission}>Sign Document</button>
            {numPages && <PageNumbers setPageNumber={setPageNumber} numPages={numPages} pageNumber={pageNumber} />}
          </div>
        )}
      </div>
    </div>
  );
}
