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
        let word = '';
        if (n > 99) {
            word += ones[Math.floor(n / 100)] + ' hundred';
            if (n % 100 > 0) {
                word += ' ' + convertTens(n % 100);
            }
        } else {
            word += convertTens(n);
        }
        return word;
    };

    const convertTens = (n) => {
        if (n < 10) return ones[n];
        if (n >= 10 && n < 20) return teens[n - 10];
        const ten = tens[Math.floor(n / 10)];
        const one = ones[n % 10];
        return ten + (one ? ' ' + one : '');
    };

    if (num === 0) return 'Zero Rupees Only.';

    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);

    let words = '';
    if (integerPart > 0) {
        let tempNum = integerPart;
        if (Math.floor(tempNum / 10000000) > 0) {
            words += convertHundreds(Math.floor(tempNum / 10000000)) + ' crore ';
            tempNum %= 10000000;
        }
        if (Math.floor(tempNum / 100000) > 0) {
            words += convertHundreds(Math.floor(tempNum / 100000)) + ' lakh ';
            tempNum %= 100000;
        }
        if (Math.floor(tempNum / 1000) > 0) {
            words += convertHundreds(Math.floor(tempNum / 1000)) + ' thousand ';
            tempNum %= 1000;
        }
        if (tempNum > 0) {
            words += convertHundreds(tempNum);
        }
        words = words.trim();
        words = words.charAt(0).toUpperCase() + words.slice(1) + ' Rupees';
    }

    if (decimalPart > 0) {
        const decimalWords = convertTens(decimalPart);
        if (words) {
            words += ' and ' + (decimalWords.charAt(0).toUpperCase() + decimalWords.slice(1)) + ' Cents';
        } else {
            words = (decimalWords.charAt(0).toUpperCase() + decimalWords.slice(1)) + ' Cents';
        }
    }
    
    return words + ' Only.';
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

    const drawPageContent = (isNewPage) => {
        if (isNewPage) {
            if (letterheadBase64) {
                const imgWidth = docPDF.internal.pageSize.getWidth();
                const imgHeight = docPDF.internal.pageSize.getHeight();
                docPDF.addImage(letterheadBase64, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
            }
            docPDF.setFontSize(titleFontSize);
            docPDF.setFont(fontType, 'bold');
            docPDF.text(title, 105, marginTop, { align: 'center' });
        }
    };

    autoTable(docPDF, {
        startY: marginTop + 55,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133] },
        styles: { font: fontType, fontSize: bodyFontSize - 1, cellPadding: 2.5 },
        margin: { left: marginLeft, right: marginRight },
        didDrawPage: (data) => {
            drawPageContent(data.pageNumber > 1);
        }
    });

    let finalY = docPDF.lastAutoTable.finalY;
    
    // --- Check for page break before printing totals ---
    let requiredHeight = 40; // Base height for totals
    if (docData.discount > 0) requiredHeight += 7;
    if (docData.advancePayment > 0) requiredHeight += 14;
    if (type === 'invoice') requiredHeight += 60; // For words and bank details
    if (docData.warrantyPeriod) requiredHeight += 20;

    if (finalY + requiredHeight > pageHeight - marginBottom) {
        docPDF.addPage();
        drawPageContent(true);
        finalY = marginTop; // Reset Y for new page
    }

    const totalsX = 130;
    const totalsValueX = 205 - marginRight;
    let currentY = finalY + 10;

    const drawRightAlignedText = (leftText, rightText, y) => {
        docPDF.text(leftText, totalsX, y);
        docPDF.text(rightText, totalsValueX, y, { align: 'right' });
    };

    docPDF.setFontSize(bodyFontSize);
    docPDF.setFont(fontType, 'normal');
    drawRightAlignedText('Subtotal:', `LKR ${docData.subtotal.toFixed(2)}`, currentY);
    currentY += 7;

    if (docData.discount > 0) {
        const discountAmount = (docData.subtotal * docData.discount) / 100;
        docPDF.setTextColor(255, 0, 0);
        drawRightAlignedText(`Discount (${docData.discount}%):`, `- LKR ${discountAmount.toFixed(2)}`, currentY);
        docPDF.setTextColor(0, 0, 0);
        currentY += 7;
    }
    
    docPDF.setFontSize(bodyFontSize + 2);
    docPDF.setFont(fontType, 'bold');
    drawRightAlignedText('Grand Total:', `LKR ${docData.total.toFixed(2)}`, currentY);
    currentY += 7;

    const balanceDue = docData.total - (docData.advancePayment || 0);

    if (docData.advancePayment > 0) {
        docPDF.setFontSize(bodyFontSize);
        docPDF.setFont(fontType, 'normal');
        docPDF.setTextColor(0, 0, 255);
        drawRightAlignedText('Advance Payment:', `- LKR ${docData.advancePayment.toFixed(2)}`, currentY);
        docPDF.setTextColor(0, 0, 0);
        currentY += 7;
    }

    docPDF.setFontSize(bodyFontSize + 2);
    docPDF.setFont(fontType, 'bold');
    drawRightAlignedText('Balance Due:', `LKR ${balanceDue.toFixed(2)}`, currentY);
    currentY += 10;
    
    finalY = currentY;

    if (type === 'invoice') {
        docPDF.setFontSize(bodyFontSize - 1);
        docPDF.setFont(fontType, 'italic');
        const words = numberToWords(docData.total);
        const splitWords = docPDF.splitTextToSize(words, 180);
        docPDF.text(`In Words: ${splitWords[0]}`, marginLeft, finalY);
        if(splitWords.length > 1) {
            docPDF.text(splitWords.slice(1), marginLeft + 15, finalY + 4);
        }
        finalY += (splitWords.length * 4) + 5;

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
        docPDF.text(`Expires On: ${new Date(docData.warrantyEndDate).toLocaleDateString()}`, marginLeft, finalY + 10);
    }
    
    // --- Finalize Footer on all pages ---
    const pageCount = docPDF.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        docPDF.setPage(i);
        docPDF.setFontSize(bodyFontSize - 2);
        docPDF.text(footerText, 105, footerY + 5, { align: 'center' });
        docPDF.text(`Page ${i} of ${pageCount}`, 210 - marginRight, footerY + 10, { align: 'right' });
    }

    if (action === 'download') {
        docPDF.save(`${title}-${docData.id}.pdf`);
    } else {
        docPDF.output('dataurlnewwindow');
    }
};

export const generateAdvancePaymentPdf = async (invoice, customer, letterheadBase64) => {
    let settings = {};
    try {
        const settingsDocRef = doc(db, 'settings', 'pdf_advance_receipt');
        const settingsSnap = await getDoc(settingsDocRef);
        if (settingsSnap.exists()) {
            settings = settingsSnap.data();
        }
    } catch (error) {
        console.error(`Could not fetch PDF settings for advance receipt, using defaults.`, error);
    }

    const marginLeft = settings.marginLeft || 20;
    const marginRight = settings.marginRight || 20;
    const marginTop = settings.marginTop || 88;
    const marginBottom = settings.marginBottom || 35;
    const titleFontSize = settings.titleFontSize || 24;
    const bodyFontSize = settings.bodyFontSize || 12;
    const fontType = settings.fontType || 'helvetica';
    const receiptTitle = settings.receiptTitle || 'ADVANCE PAYMENT RECEIPT';
    const footerText = settings.footerText || 'Thank you for your payment!';

    const docPDF = new jsPDF();
    const pageHeight = 297;
    const footerY = pageHeight - marginBottom;

    if (letterheadBase64) {
        const imgWidth = docPDF.internal.pageSize.getWidth();
        const imgHeight = docPDF.internal.pageSize.getHeight();
        docPDF.addImage(letterheadBase64, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    }

    docPDF.setFontSize(titleFontSize);
    docPDF.setFont(fontType, 'bold');
    docPDF.text(receiptTitle, 105, marginTop - 20, { align: 'center' });

    docPDF.setFontSize(bodyFontSize);
    docPDF.setFont(fontType, 'normal');
    docPDF.text(`Receipt No: ADV-${invoice.id}`, marginLeft, marginTop);
    docPDF.text(`Date: ${new Date().toLocaleDateString()}`, 210 - marginRight, marginTop, { align: 'right' });
    docPDF.text(`Quotation No: ${invoice.quotationId}`, marginLeft, marginTop + 7);

    docPDF.setLineWidth(0.2);
    docPDF.line(marginLeft, marginTop + 15, 210 - marginRight, marginTop + 15);

    docPDF.setFont(fontType, 'bold');
    docPDF.text('Received From:', marginLeft, marginTop + 25);
    docPDF.setFont(fontType, 'normal');
    const customerAddress = `${customer?.name || ''}\n${customer?.address || ''}\n${customer?.email || ''}\n${customer?.telephone || ''}`;
    docPDF.text(customerAddress, marginLeft, marginTop + 32);

    docPDF.setFontSize(bodyFontSize + 2);
    docPDF.setFont(fontType, 'bold');
    docPDF.text('Amount Received:', marginLeft, marginTop + 60);
    docPDF.text(`LKR ${invoice.advancePayment.toFixed(2)}`, 210 - marginRight, marginTop + 60, { align: 'right' });

    docPDF.setFontSize(bodyFontSize);
    docPDF.setFont(fontType, 'italic');
    const words = numberToWords(invoice.advancePayment);
    const splitWords = docPDF.splitTextToSize(`In Words: ${words}`, 180);
    docPDF.text(splitWords, marginLeft, marginTop + 70);

    docPDF.setLineWidth(0.2);
    docPDF.line(marginLeft, footerY - 10, 210 - marginRight, footerY - 10);
    docPDF.setFontSize(bodyFontSize - 2);
    docPDF.text('This is a computer-generated receipt and does not require a signature.', 105, footerY, { align: 'center' });
    docPDF.text(footerText, 105, footerY + 5, { align: 'center' });

    docPDF.save(`Advance-Receipt-${invoice.id}.pdf`);
};


// --- Data Constants ---
export const countries = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo, Democratic Republic of the","Congo, Republic of the","Costa Rica","Cote d'Ivoire","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-issau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar (Burma)","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine State","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States of America","Uruguay","Uzbekistan","Vanuatu","Vatican City (Holy See)","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];
export const unitsOfMeasure = ["pieces (pcs)", "sets", "units", "meters (m)", "kilograms (kg)", "liters (L)"];

