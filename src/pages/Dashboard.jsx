import { Card, Row, Col, Statistic, Table, Tag } from 'antd';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MdArrowUpward, MdArrowDownward, MdPeople, MdShoppingCart, MdAttachMoney } from 'react-icons/md';

const Dashboard = () => {
  // Sample data for charts
  const lineChartData = [
    { month: 'Jan', revenue: 4000, orders: 2400 },
    { month: 'Feb', revenue: 3000, orders: 1398 },
    { month: 'Mar', revenue: 2000, orders: 9800 },
    { month: 'Apr', revenue: 2780, orders: 3908 },
    { month: 'May', revenue: 1890, orders: 4800 },
    { month: 'Jun', revenue: 2390, orders: 3800 },
    { month: 'Jul', revenue: 3490, orders: 4300 },
  ];

  const barChartData = [
    { category: 'Electronics', sales: 4000 },
    { category: 'Clothing', sales: 3000 },
    { category: 'Food', sales: 2000 },
    { category: 'Books', sales: 2780 },
    { category: 'Toys', sales: 1890 },
  ];

  const pieChartData = [
    { name: 'Desktop', value: 400 },
    { name: 'Mobile', value: 300 },
    { name: 'Tablet', value: 200 },
    { name: 'Other', value: 100 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Sample data for table
  const tableColumns = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `$${amount}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'Completed' ? 'green' : status === 'Pending' ? 'gold' : 'red';
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  const tableData = [
    { key: '1', orderId: '#001', customer: 'John Doe', product: 'Laptop', amount: 1200, status: 'Completed' },
    { key: '2', orderId: '#002', customer: 'Jane Smith', product: 'Phone', amount: 800, status: 'Pending' },
    { key: '3', orderId: '#003', customer: 'Bob Johnson', product: 'Tablet', amount: 450, status: 'Completed' },
    { key: '4', orderId: '#004', customer: 'Alice Brown', product: 'Headphones', amount: 150, status: 'Cancelled' },
    { key: '5', orderId: '#005', customer: 'Charlie Wilson', product: 'Monitor', amount: 350, status: 'Completed' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={93000}
              precision={2}
              prefix="$"
              suffix={<MdArrowUpward style={{ color: '#3f8600' }} />}
              valueStyle={{ color: '#3f8600' }}
              className="stats-card"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={1234}
              suffix={<MdArrowUpward style={{ color: '#3f8600' }} />}
              valueStyle={{ color: '#3f8600' }}
              prefix={<MdShoppingCart />}
              className="stats-card"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Customers"
              value={567}
              suffix={<MdArrowDownward style={{ color: '#cf1322' }} />}
              valueStyle={{ color: '#cf1322' }}
              prefix={<MdPeople />}
              className="stats-card"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg Order Value"
              value={75.5}
              precision={2}
              prefix="$"
              suffix={<MdArrowUpward style={{ color: '#3f8600' }} />}
              valueStyle={{ color: '#3f8600' }}
              className="stats-card"
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Revenue & Orders Trend" bordered={false}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="orders" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Sales by Category" bordered={false}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={8}>
          <Card title="Traffic Sources" bordered={false}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="Recent Orders" bordered={false}>
            <Table columns={tableColumns} dataSource={tableData} pagination={false} scroll={{ x: 800 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;