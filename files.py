from fastapi import APIRouter, UploadFile, File
import PyPDF2
import docx
import json
import csv
from io import BytesIO, StringIO
from app.core.config import settings
from app.core.exceptions import FileProcessingError

router = APIRouter(prefix="/api/files")

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise FileProcessingError(f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE} bytes")
    
    filename = file.filename.lower()
    text = ""
    
    try:
        if filename.endswith(".txt"):
            text = contents.decode("utf-8")
        elif filename.endswith(".pdf"):
            reader = PyPDF2.PdfReader(BytesIO(contents))
            text = "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
        elif filename.endswith(".docx"):
            doc = docx.Document(BytesIO(contents))
            text = "\n".join([p.text for p in doc.paragraphs])
        elif filename.endswith(".json"):
            data = json.loads(contents.decode("utf-8"))
            text = json.dumps(data, indent=2)
        elif filename.endswith(".csv"):
            csv_reader = csv.reader(StringIO(contents.decode("utf-8")))
            text = "\n".join([", ".join(row) for row in csv_reader])
        else:
            raise FileProcessingError("Unsupported file type")
    except Exception as e:
        raise FileProcessingError(f"Error processing file: {str(e)}")
        
    return {"filename": file.filename, "content": text}
