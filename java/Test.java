import java.util.*;

public class Test {
  public static void main(String args[]) {
    TreeNode root = new TreeNode();

    root.value = 1;
    root.left = new TreeNode(2);
    root.right = new TreeNode(3);

    ArrayList<LinkedList<TreeNode>> results = findLevelLinkList( root );
    for ( LinkedList<TreeNode> list : results ) {
      System.out.println("list");
      for ( TreeNode node : list ) {
        System.out.println("List");
      }
    }
  }

  // Question 4.4
  public static ArrayList<LinkedList<TreeNode>> findLevelLinkList(TreeNode root) {
    int level = 0;
    ArrayList<LinkedList<TreeNode>> results = new ArrayList<LinkedList<TreeNode>>();

    // Root
    LinkedList<TreeNode> list = new LinkedList<TreeNode>();
    list.add(root);
    results.add(level, list);

    while(true) {
      // Count from current level for next level searches
      LinkedList<TreeNode> level_list = new LinkedList<TreeNode>();
      for (int i = 0; i < results.get(level).size(); i++) {
        TreeNode node = results.get(level).get(i);
        if (node != null) {
          level_list.add(node.right);
          level_list.add(node.left);
        }
      }

      // Exit condition
      if (level_list.size() > 0) {
        results.add(level+1, list);
      } else {
        break;
      }

      level++;
    }

    return results;
  }

  public static int fibonacci(int n) {
    if (n == 0) return 0;
    if (n == 1) return 1;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }

  public static ArrayList<String> permuString(String s) {
    ArrayList<String> all_permutation_string = new ArrayList<String>();
    if (s.length() == 2) {
      all_permutation_string.add(new String("" + s.charAt(0) + s.charAt(1)));
      all_permutation_string.add(new String("" + s.charAt(1) + s.charAt(0)));
    } else {
      char c = s.charAt(0);
      for( String temp : permuString(s.substring(1))) {
        // insert char c from index 0 to temp.length.
        // not like this
        all_permutation_string.add(c + s);
        all_permutation_string.add(s + c);
      }
    }
    return all_permutation_string;
  }

  public static void imgFill(int color, int x, int y, int[][] image) {
    // if [x,y] is color, do nothing
    // if [x,y] is not color, color self
    //   check each direction, if they're color, do nothing

  }

  public static int makeChange(int n, int coin) {
    int max_count = 0;
    int next_coin = 0;
    int ways = 0;
    if ( coin == 25 ) {
      next_coin = 10;
    } else if ( coin == 10 ) {
      next_coin = 5;
    } else if ( coin == 5 ) {
      next_coin = 1;
    } else if ( coin == 1 ) {
      return 1;
    }

    for (; max_count * coin < n; max_count++);
    for (int i = 0; i < max_count; i++) {
      ways += makeChange(n - max_count*coin, next_coin);
    }
    return ways;
  }


  public static void placeQueen (int n) {

  }

  public static void

}

class TreeNode {
  TreeNode left;
  TreeNode right;
  int value;

  public TreeNode() {
    left = null;
    right = null;
    value = 0;
  }

  public TreeNode(int v) {
    value = v;
  }
}