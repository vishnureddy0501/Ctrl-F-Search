
app.get('/sec-link1', async (req, res) => {
  const url = 'https://www.sec.gov/Archives/edgar/data/1318605/000162828024043486/tsla-20240930.htm';
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'ransom app App/1.0 (your.email@domain.com)',
      }
    });
    
    res.send(response.data);
  } catch (error) {
    console.log("error occured");
    res.status(500).send({message: "Error Occured"});
  }
});
