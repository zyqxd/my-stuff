import java.io.*; 
import java.util.*; 
import java.lang.*;
import java.net.*;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpression;
import javax.xml.xpath.XPathExpressionException;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Document;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;


class Fremont {
    static TreeMap<String, String> worldTree = new TreeMap(String.CASE_INSENSITIVE_ORDER);

    public static void main (String[] args) throws Exception{
//        gotoURL("http://www.thefremontproject.com/rabbithole/");
        gotoBaseURL("http://www.scotiabanknuitblanche.ca/project.html?project_id=");
    }

    public static void gotoBaseURL(String url) throws Exception{
        int test = 1000;
        int buffer = 1000;
        
        while (buffer > 0) {
            URL obj = new URL(String.format("%s%d",url,test));
            
            //Create DocumentBuilderFactory for reading xml file
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();;
            Document doc = builder.parse(obj.openStream());
            
            // Create XPathFactory for creating XPath Object
            XPathFactory xPathFactory = XPathFactory.newInstance();
            
            // Create XPath object from XPathFactory
            XPath xpath = xPathFactory.newXPath();

            XPathExpression expr = xpath.compile(".//div[@id='project-details']/div[@class='right-column']/h4[@class='title']/text()");
            Object result = expr.evaluate(doc, XPathConstants.NODESET);
            System.out.println("Java Xpath text example: All brands of popular smartphones ");
            printXpathResult(result);

            
//            HttpURLConnection conn = (HttpURLConnection) obj.openConnection();
//            conn.setInstanceFollowRedirects(false);
//            
//            int status = conn.getResponseCode();
//            System.out.println(status);
//            if (status >= 300 || status < 400) {
//                buffer--;
//                test++;
//            } else {
//                System.out.println("Request URL: " + obj.toString());
//            }
        }
    }
    
    public static void printXpathResult(Object result){
        NodeList nodes = (NodeList) result;
        for (int i = 0; i < nodes.getLength(); i++) {
            System.out.println(nodes.item(i).getNodeValue());
        }
    }

    public static String findNextCode (String line) {
        // If line starts with <a tag, we there
        int indexStart = line.indexOf("/rabbithole/next");
        if ( indexStart != -1 ) {
            int indexEnd = line.indexOf(".html");
            return line.substring(indexStart+17, indexEnd);
        } else {
            return null;
        }
    }

    public static void gotoURL(String url) throws Exception{
        URL start = new URL(url);
        BufferedReader br = new BufferedReader(new InputStreamReader(start.openStream()));
        String strTemp = br.readLine();

        while ( strTemp != null ) {
            String code = findNextCode(strTemp);
            if ( code != null ) {
                if ( !putInTree(code) ) {
                    System.out.println("Hit dupe! " + code);
                    break;
                } else {
                    System.out.println(code);
                }
                
                // travel
                gotoURL(String.format("http://www.thefremontproject.com/rabbithole/next/%s.html", code));
                break;
            }
            strTemp = br.readLine();
        }
    }
    

    public static boolean putInTree(String code) {
        if ( worldTree.containsKey(code) ) {
            return false;
        } else {
            worldTree.put(code, " ");
            return true;
        }
    }
}
