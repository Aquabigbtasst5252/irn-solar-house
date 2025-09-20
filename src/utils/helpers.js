import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../services/firebase';
import { doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';

// --- NEW Centralized Activity Logging Helper ---
export const logActivity = async (user, action, details = {}) => {
    try {
        await addDoc(collection(db, 'activity_logs'), {
            timestamp: Timestamp.now(),
            userId: user.uid,
            userName: user.displayName || user.email,
            action: action,
            details: details 
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
};

export const getUserProfile = async (uid) => {
  if (!db) return null;
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);
  return userDocSnap.exists() ? userDocSnap.data() : null;
};

// --- Helper function to convert number to words ---
const numberToWords = (num) => {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const convertHundreds = (n) => {
        if (n > 99) {
            return ones[Math.floor(n / 100)] + ' hundred ' + convertTens(n % 100);
        }
        return convertTens(n);
    };

    const convertTens = (n) => {
        if (n < 10) return ones[n];
        if (n >= 10 && n < 20) return teens[n - 10];
        return tens[Math.floor(n / 10)] + ' ' + ones[n % 10];
    };

    if (num === 0) return 'Zero';
    let words = '';
    if (Math.floor(num / 1000000) > 0) {
        words += convertHundreds(Math.floor(num / 1000000)) + ' million ';
        num %= 1000000;
    }
    if (Math.floor(num / 1000) > 0) {
        words += convertHundreds(Math.floor(num / 1000)) + ' thousand ';
        num %= 1000;
    }
    if (num > 0) {
        words += convertHundreds(num);
    }
    
    return (words.charAt(0).toUpperCase() + words.slice(1)).trim() + ' Rupees Only.';
};


export const generatePdf = async (docData, type, letterheadBase64, customer, action = 'download') => {
    let settings = {};
    try {
        const docId = `pdf_${type}`; 
        const settingsDocRef = doc(db, 'settings', docId);
        const settingsSnap = await getDoc(settingsDocRef);
        if (settingsSnap.exists()) {
            settings = settingsSnap.data();
        }
    } catch (error) {
        console.error(`Could not fetch PDF settings for ${type}, using defaults.`, error);
    }

    const marginLeft = settings.marginLeft || 20;
    const marginRight = settings.marginRight || 20;
    const marginTop = settings.marginTop || 88;
    const marginBottom = settings.marginBottom || 35;
    const pageHeight = 297;
    const footerY = pageHeight - marginBottom;

    const titleFontSize = settings.titleFontSize || 22;
    const bodyFontSize = settings.bodyFontSize || 10;
    const fontType = settings.fontType || 'helvetica';
    const quotationTitle = settings.quotationTitle || 'QUOTATION';
    const invoiceTitle = settings.invoiceTitle || 'INVOICE';
    const footerText = settings.footerText || 'Thank you for your business!';

    const docPDF = new jsPDF();
    
    if (letterheadBase64) {
        const imgWidth = docPDF.internal.pageSize.getWidth();
        const imgHeight = docPDF.internal.pageSize.getHeight();
        docPDF.addImage(letterheadBase64, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    }

    const title = type === 'invoice' ? invoiceTitle : quotationTitle;
    docPDF.setFontSize(titleFontSize);
    docPDF.setFont(fontType, 'bold');
    docPDF.text(title, 105, marginTop, { align: 'center' });

    docPDF.setFontSize(bodyFontSize);
    docPDF.setFont(fontType, 'normal');
    docPDF.text(`Ref No: ${docData.id}`, marginLeft, marginTop + 15);
    docPDF.text(`Date: ${new Date(docData.createdAt.seconds * 1000).toLocaleDateString()}`, 210 - marginRight, marginTop + 15, { align: 'right' });

    docPDF.setFont(fontType, 'bold');
    docPDF.text('Bill To:', marginLeft, marginTop + 30);
    docPDF.setFont(fontType, 'normal');
    const customerAddress = `${customer?.name || ''}\n${customer?.address || ''}\n${customer?.email || ''}\n${customer?.telephone || ''}`;
    docPDF.text(customerAddress, marginLeft, marginTop + 35);

    const tableColumn = ["#", "Item Description", "Qty", "Unit Price (LKR)", "Total (LKR)"];
    const tableRows = [];
    docData.items.forEach((item, index) => {
        const itemData = [
            index + 1,
            `${item.name}${item.model ? ' - ' + item.model : ''}\n${item.serials && item.serials.length > 0 ? 'SN: ' + item.serials.join(', ') : ''}`,
            item.qty,
            item.unitPrice.toFixed(2),
            item.totalPrice.toFixed(2)
        ];
        tableRows.push(itemData);
    });

    autoTable(docPDF, {
        startY: marginTop + 55,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133] },
        styles: { font: fontType, fontSize: bodyFontSize - 1 },
        margin: { left: marginLeft, right: marginRight },
        didDrawCell: (data) => {
            if (data.column.index === 1 && data.cell.section === 'body') {
                docPDF.setFontSize(bodyFontSize - 2);
            }
        },
        didDrawPage: function (data) {
            if (data.pageNumber > 1) {
                if (letterheadBase64) {
                    const imgWidth = docPDF.internal.pageSize.getWidth();
                    const imgHeight = docPDF.internal.pageSize.getHeight();
                    docPDF.addImage(letterheadBase64, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
                }
                docPDF.setFontSize(titleFontSize);
                docPDF.setFont(fontType, 'bold');
                docPDF.text(title, 105, marginTop, { align: 'center' });
            }
            const pageCount = docPDF.internal.getNumberOfPages();
            docPDF.setFontSize(bodyFontSize - 2);
            docPDF.text(footerText, 105, footerY + 5, { align: 'center' });
            docPDF.text(`Page ${data.pageNumber} of ${pageCount}`, 210 - marginRight, footerY + 10, { align: 'right' });
        }
    });

    let finalY = docPDF.lastAutoTable.finalY;
    const totalsX = 140;
    const totalsValueX = 210 - marginRight;
    
    docPDF.setFontSize(bodyFontSize);
    docPDF.setFont(fontType, 'normal');
    docPDF.text(`Subtotal:`, totalsX, finalY + 10);
    docPDF.text(`LKR ${docData.subtotal.toFixed(2)}`, totalsValueX, finalY + 10, { align: 'right' });

    if (docData.discount > 0) {
        const discountAmount = (docData.subtotal * docData.discount) / 100;
        docPDF.setFont(fontType, 'normal');
        docPDF.setTextColor(255, 0, 0);
        docPDF.text(`Discount (${docData.discount}%):`, totalsX, finalY + 17);
        docPDF.text(`- LKR ${discountAmount.toFixed(2)}`, totalsValueX, finalY + 17, { align: 'right' });
        docPDF.setTextColor(0, 0, 0);
    }
    
    docPDF.setFontSize(bodyFontSize + 2);
    docPDF.setFont(fontType, 'bold');
    docPDF.text(`Grand Total:`, totalsX, finalY + 24);
    docPDF.text(`LKR ${docData.total.toFixed(2)}`, totalsValueX, finalY + 24, { align: 'right' });
    
    finalY += 30;

    if (type === 'invoice') {
        docPDF.setFontSize(bodyFontSize - 1);
        docPDF.setFont(fontType, 'italic');
        docPDF.text(`In Words: ${numberToWords(docData.total)}`, marginLeft, finalY);
        
        finalY += 10;

        docPDF.setFontSize(bodyFontSize);
        docPDF.setFont(fontType, 'bold');
        docPDF.text('Bank Details:', marginLeft, finalY);
        docPDF.setFont(fontType, 'normal');
        
        docPDF.text("Bank: Hatton National Bank", marginLeft, finalY + 5);
        docPDF.text("Branch: Minuwangoda", marginLeft, finalY + 10);
        docPDF.text("Account Number: 0940 2029 4277", marginLeft, finalY + 15);
        
        docPDF.text("Bank: Commercial Bank", marginLeft, finalY + 25);
        docPDF.text("Branch: Katana", marginLeft, finalY + 30);
        docPDF.text("Account Number: 1000867099", marginLeft, finalY + 35);

        docPDF.setFont(fontType, 'bold');
        docPDF.text("Account Holder: IRN Enterprises", marginLeft, finalY + 45);
        
        finalY += 50; 
    }
    
    if (docData.warrantyPeriod) {
        docPDF.setFontSize(bodyFontSize - 1);
        docPDF.setFont(fontType, 'bold');
        docPDF.text('Warranty Information:', marginLeft, finalY);
        docPDF.setFont(fontType, 'normal');
        docPDF.text(`Period: ${docData.warrantyPeriod}`, marginLeft, finalY + 5);
        docPDF.text(`Expires On: ${docData.warrantyEndDate}`, marginLeft, finalY + 10);
    }
    
    docPDF.save(`${title}-${docData.id}.pdf`);
};


// --- Data Constants ---
export const countries = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo, Democratic Republic of the","Congo, Republic of the","Costa Rica","Cote d'Ivoire","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-issau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar (Burma)","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine State","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States of America","Uruguay","Uzbekistan","Vanuatu","Vatican City (Holy See)","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];
export const unitsOfMeasure = ["pieces (pcs)", "sets", "units", "meters (m)", "kilograms (kg)", "liters (L)"];

