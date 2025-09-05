import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, DollarSign, TrendingUp, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
}

const categories = [
  { value: "food", label: "Food & Dining", color: "category-food" },
  { value: "transport", label: "Transportation", color: "category-transport" },
  { value: "entertainment", label: "Entertainment", color: "category-entertainment" },
  { value: "shopping", label: "Shopping", color: "category-shopping" },
  { value: "utilities", label: "Bills & Utilities", color: "category-utilities" },
  { value: "healthcare", label: "Healthcare", color: "category-healthcare" },
  { value: "other", label: "Other", color: "category-other" },
];

const ExpenseTracker = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  // Load expenses from localStorage on component mount
  useEffect(() => {
    const savedExpenses = localStorage.getItem('expenses');
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    }
  }, []);

  // Save expenses to localStorage whenever expenses change
  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  const addExpense = () => {
    if (!amount || !description || !category) {
      toast.error("Please fill in all fields");
      return;
    }

    const newExpense: Expense = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      description,
      category,
      date: new Date().toLocaleDateString(),
    };

    setExpenses([newExpense, ...expenses]);
    setAmount("");
    setDescription("");
    setCategory("");
    toast.success("Expense added successfully!");
  };

  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter((expense) => expense.id !== id));
    toast.success("Expense deleted");
  };

  const resetAllExpenses = () => {
    setExpenses([]);
    localStorage.removeItem('expenses');
    toast.success("All expenses cleared");
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const getCategoryColor = (categoryValue: string) => {
    const cat = categories.find(c => c.value === categoryValue);
    return cat ? cat.color : "category-other";
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Expense Tracker
          </h1>
          <p className="text-muted-foreground text-lg">
            Track your spending and manage your budget with ease
          </p>
        </div>

        {/* Stats Card */}
        <Card className="bg-gradient-card shadow-elevated border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-3xl font-bold text-foreground">
                    ${totalExpenses.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">{expenses.length} transactions</span>
                </div>
                {expenses.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAllExpenses}
                    className="text-destructive border-destructive/20 hover:bg-destructive/10"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset All
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Add Expense Form */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-primary" />
                <span>Add New Expense</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="What did you spend on?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full bg-${cat.color}`} />
                          <span>{cat.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={addExpense} 
                className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300"
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </CardContent>
          </Card>

          {/* Expenses List */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No expenses yet. Add your first expense!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full bg-${getCategoryColor(expense.category)}`} />
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {categories.find(c => c.value === expense.category)?.label} • {expense.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-lg">
                          ${expense.amount.toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteExpense(expense.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExpenseTracker;