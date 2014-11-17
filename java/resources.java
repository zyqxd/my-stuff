// This is a non compilable java file full of useful functions under java


/* File IO */
import java.io.*;
PrintStream pout = null;
BufferedReader br = null;

try {
  FileOutputStream out = new FileOutputStream("output.txt");
  br = new BufferedReader(new FileReader("input.txt"));
  pout = new PrintStream(out);

  String line;
  while ((line = br.readLine()) != null) {
     pout.println(line);
  }
  br.close();
} catch (Exception e) {
  e.printStackTrace();
}
br.close();
pout.close();





/* Custom String Sort */
public class CustomSort implements Comparator<String> {
  public String sortChars(String s) {
    char[] char_array = s.toCharArray();
    Array.sort(char_array);
    return new String(char_array);
  }

  /* Implement this method!! */
  public int compare(String s1, String s2) {
    return sortChars(s1).compareTo(sortChars(s2));
  }
  // Usage =
  // Array.sort(array_of_strings, new CustomSort());
}





/* BFS and ENUM */
import java.util.*;

public enum State {
  Unvisited, Visiting, Visited;
}

public static boolean bfs(Graph g, Node start, Node end) {
  LinkedList<Node> q = new LinkedList<Node>(); // Stack for bfs, Queue for dfs
  for (Node u : g.getNodes()) {
    u.state = State.Unvisited;
  }
  start.state = State.Visiting;
  q.add(start);
  Node u;
  while ( !q.isEmpty() ) {
    u = q.removeFirst();
    if ( u != null ) {
      for ( Node v : u.getAdjacent() ) {
        if ( v.state = State.Unvisited ) {
          if ( v == end ) {
            return true;
          } else {
            v.state = State.Visiting;
            q.add(v);
          }
        }
      }
      u.state = State.Visited;
    }
  }
  return false;
}