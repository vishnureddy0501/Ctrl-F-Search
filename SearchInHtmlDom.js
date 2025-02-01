import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const XMLRenderer = () => {
	const [xmlData, setXmlData] = useState("");
	const [showPopup, setShowPopup] = useState(false);
	const [searchText, setSearchText] = useState("");
	const [matches, setMatches] = useState([]);
	const [currentIndex, setCurrentIndex] = useState(-1);
	const containerRef = useRef(null);
	const handleChange = (event) => {
		setSearchText(event.target.value);
	};

	const escapeRegExp = (string) => {
		return string.replace(/[-/\\^$?()|[\]{}]/g, "\\$&");
	};

	const fetchAndHighlightXML = async () => {
		if (searchText.length < 3) return;
		try {
			const response = await axios.get("/sec-link1");
			let updatedData = response.data;

			// Parse as HTML while keeping styles intact
			const parser = new DOMParser();
			const doc = parser.parseFromString(updatedData, "text/html");
			if (doc.body) {
				updatedData = doc.body.innerHTML;
			}

			// Replace &nbsp; while keeping styles
			updatedData = updatedData
				.replace(/&nbsp;/g, " ")
				.replace(/\u00A0/g, " ");

			setXmlData(updatedData);

			setShowPopup(true);
		} catch (error) {
			console.error("Error fetching XML data:", error);
		}
	};

	useEffect(() => {
		if (showPopup) {
			highlightMatches();
		}
	}, [showPopup, xmlData, searchText]);

	useEffect(() => {
		if (matches.length > 0) {
			setTimeout(() => scrollToMatch(0), 100);
		}
	}, [matches]);

	const scrollToMatch = (index) => {
		if (matches.length === 0) return;
		const match = matches[index];

		if (match?.node) {
			match.node.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	};

  const highlightMatches = () => {
    if (!searchText || searchText.length < 3 || !containerRef.current) return;
  
    const regex = new RegExp(escapeRegExp(searchText), "gi");
  
    // Step 1: Gather all text nodes
    const walker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
  
    let textNodes = [];
    let fullText = "";
  
    while (walker.nextNode()) {
      let node = walker.currentNode;
      textNodes.push({ node, start: fullText.length });
      fullText += node.textContent;
    }
  
    // Step 2: Find matches in the combined text
    let matchList = [];
    let matches = [...fullText.matchAll(regex)];
  
    matches.forEach((match) => {
      matchList.push({
        start: match.index,
        length: match[0].length,
        node: null, // Will store later
      });
    });
  
    if (matchList.length === 0) {
      setMatches([]);
      setCurrentIndex(-1);
      return;
    }
  
    // Step 3: Reconstruct text nodes with highlights
    let newNodes = [];
    let matchIndex = 0;
    let currentMatch = matchList[matchIndex];
  
    textNodes.forEach(({ node, start }) => {
      if (!currentMatch) {
        newNodes.push({
          oldNode: node,
          newContent: [document.createTextNode(node.textContent)],
        });
        return;
      }
  
      let text = node.textContent;
      let nodeEnd = start + text.length;
      let newNodeContent = [];
      let localOffset = 0;
  
      while (currentMatch && currentMatch.start < nodeEnd) {
        let matchStart = currentMatch.start;
        let matchEnd = matchStart + currentMatch.length;
  
        let localStart = Math.max(0, matchStart - start);
        let localEnd = Math.min(text.length, matchEnd - start);
  
        if (localStart > localOffset) {
          newNodeContent.push(
            document.createTextNode(text.slice(localOffset, localStart))
          );
        }
  
        // Ensure we're actually adding text to the span
        let matchedText = text.slice(localStart, localEnd);
        if (matchedText.length > 0) {
          let span = document.createElement("span");
          span.className = "highlighted-text";
          span.textContent = matchedText;
          newNodeContent.push(span);
  
          // Store reference to highlighted node
          currentMatch.node = span;
        }
  
        localOffset = localEnd;
  
        if (matchEnd >= nodeEnd) break;
        matchIndex++;
        currentMatch = matchList[matchIndex];
      }
  
      if (localOffset < text.length) {
        newNodeContent.push(
          document.createTextNode(text.slice(localOffset))
        );
      }
  
      newNodes.push({ oldNode: node, newContent: newNodeContent });
    });
  
    // Step 4: Replace old text nodes with new highlighted structure
    newNodes.forEach(({ oldNode, newContent }) => {
      let parent = oldNode.parentNode;
      newContent.forEach((newNode) => parent.insertBefore(newNode, oldNode));
      parent.removeChild(oldNode);
    });
  
    setMatches(matchList);
    setCurrentIndex(0);
  
    if (matchList.length > 0) {
      setTimeout(() => scrollToMatch(0), 50);
    }
  };
  

	const nextMatch = () => {
		if (matches.length === 0) return;
		const newIndex = (currentIndex + 1) % matches.length;
		setCurrentIndex(newIndex);
		scrollToMatch(newIndex);
	};

	const prevMatch = () => {
		if (matches.length === 0) return;
		const newIndex = (currentIndex - 1 + matches.length) % matches.length;
		setCurrentIndex(newIndex);
		scrollToMatch(newIndex);
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-4">
			<input
				type="text"
				value={searchText}
				onChange={handleChange}
				placeholder="Search..."
				className="border p-2 rounded-md"
			/>
			<button
				onClick={fetchAndHighlightXML}
				className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition mt-2"
			>
				Open
			</button>

			{showPopup && (
				<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
					<div className="bg-white p-6 rounded-lg w-3/4 max-h-[80vh] overflow-y-auto shadow-lg">
						<div className="flex justify-between items-center mb-2">
							<button
								className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
								onClick={() => setShowPopup(false)}
							>
								Close
							</button>
							<div className="flex gap-2">
								<button
									onClick={prevMatch}
									disabled={matches.length === 0}
									className="px-3 py-1 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition"
								>
									Prev
								</button>
								<span>
									{matches.length > 0
										? `${currentIndex + 1} / ${
												matches.length
										  }`
										: "0 / 0"}
								</span>
								<button
									onClick={nextMatch}
									disabled={matches.length === 0}
									className="px-3 py-1 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition"
								>
									Next
								</button>
							</div>
						</div>
						<div
							ref={containerRef}
							className="mt-2 text-sm"
							dangerouslySetInnerHTML={{ __html: xmlData }}
						/>
					</div>
				</div>
			)}

			<style>
				{`
          .highlighted-text {
            background: yellow;
            color: black;
          }
        `}
			</style>
		</div>
	);
};

export default XMLRenderer;
