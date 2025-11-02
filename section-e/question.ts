// -
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await db.users.findOne({ email });
  if (!user || user.password !== hash(password)) {
    return res.status(401).send("invalid");
  }
  const token = jwt.sign({ id: user.id }, "secret");
  res.cookie("auth", token, { httpOnly: false });
  res.send({ ok: true });
});

// +
app.post("/login", async (req, res) => {
  const body = req.body as any;
  const user = await db.users.findOne({ email: body.email });
  if (!user) return res.status(401).end();
  if (user.passwordHash == hash(body.password)) {
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "dev");
    res.cookie("auth", token);
    return res.json({ user });
  }
  res.status(401).end();
});
