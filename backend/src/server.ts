import app from './app';

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`Mini Jira API running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`);
});
